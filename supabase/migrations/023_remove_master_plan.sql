-- =============================================================================
-- 023_remove_master_plan.sql
-- Remove master tier — only free/pro remain
-- =============================================================================

-- 1. Downgrade any existing master users/subscriptions to pro
UPDATE public.users SET plan = 'pro' WHERE plan = 'master';
UPDATE public.subscriptions SET tier = 'pro' WHERE tier = 'master';

-- 2. Update CHECK constraints
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'pro'));

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'pro'));

-- 3. Update deduct_credit function — remove master unlimited branch
CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id UUID,
  p_action TEXT,
  p_cost INTEGER DEFAULT 1,
  p_clip_id UUID DEFAULT NULL,
  p_monthly_limit INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_monthly_limit INTEGER;
  v_monthly_used INTEGER;
  v_month_start TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT plan INTO v_plan FROM public.users WHERE id = p_user_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'USER_NOT_FOUND');
  END IF;

  -- Use caller-provided limit (single source of truth from TypeScript config)
  IF p_monthly_limit IS NOT NULL THEN
    v_monthly_limit := p_monthly_limit;
  ELSIF v_plan = 'pro' THEN
    v_monthly_limit := 500;
  ELSE
    v_monthly_limit := 100;
  END IF;

  v_month_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  SELECT COALESCE(SUM(cost), 0) INTO v_monthly_used
  FROM public.credit_usage
  WHERE user_id = p_user_id
    AND created_at >= v_month_start;

  IF v_monthly_used + p_cost > v_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'INSUFFICIENT_CREDITS',
      'used', v_monthly_used,
      'limit', v_monthly_limit
    );
  END IF;

  INSERT INTO public.credit_usage (user_id, action, cost, clip_id)
  VALUES (p_user_id, p_action, p_cost, p_clip_id);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_monthly_limit - v_monthly_used - p_cost,
    'used', v_monthly_used + p_cost,
    'limit', v_monthly_limit
  );
END;
$$;
