-- =============================================================================
-- 017_plan_system.sql
-- Plan & Credit System — subscription tier alignment + credit usage tracking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update subscriptions tier CHECK to match 3-tier model (free/pro/master)
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'pro', 'master'));

-- Migrate any legacy tier values
UPDATE public.subscriptions SET tier = 'free' WHERE tier = 'starter';
UPDATE public.subscriptions SET tier = 'master' WHERE tier = 'team';

-- ---------------------------------------------------------------------------
-- 2. Add plan column to users table for quick tier lookup
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro', 'master'));

-- Sync existing subscriptions to users.plan
UPDATE public.users u
SET plan = COALESCE(
  (SELECT s.tier FROM public.subscriptions s
   WHERE s.user_id = u.id AND s.status = 'active'),
  'free'
);

-- ---------------------------------------------------------------------------
-- 3. Create credit_usage table for granular tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL CHECK (action IN (
    'AI_SUMMARY', 'AI_CHAT', 'AI_STUDIO', 'AI_INSIGHTS', 'AI_EMBEDDING'
  )),
  cost        INTEGER     NOT NULL DEFAULT 1,
  clip_id     UUID        REFERENCES public.clips(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.credit_usage IS 'Granular AI credit usage log per user per action.';

CREATE INDEX IF NOT EXISTS idx_credit_usage_user_month
  ON public.credit_usage (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_usage_user_action
  ON public.credit_usage (user_id, action);

-- ---------------------------------------------------------------------------
-- 4. Create studio_usage view for Content Studio generation tracking
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.monthly_credit_summary AS
SELECT
  user_id,
  action,
  SUM(cost) AS total_cost,
  COUNT(*) AS usage_count,
  date_trunc('month', created_at) AS month
FROM public.credit_usage
GROUP BY user_id, action, date_trunc('month', created_at);

-- ---------------------------------------------------------------------------
-- 5. RLS for credit_usage
-- ---------------------------------------------------------------------------
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_usage_select ON public.credit_usage
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY credit_usage_insert ON public.credit_usage
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 6. Function: check and deduct credits atomically
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id UUID,
  p_action TEXT,
  p_cost INTEGER DEFAULT 1,
  p_clip_id UUID DEFAULT NULL
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
  -- Get user's plan
  SELECT plan INTO v_plan FROM public.users WHERE id = p_user_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'USER_NOT_FOUND');
  END IF;

  -- Master plan = unlimited
  IF v_plan = 'master' THEN
    INSERT INTO public.credit_usage (user_id, action, cost, clip_id)
    VALUES (p_user_id, p_action, p_cost, p_clip_id);
    RETURN jsonb_build_object('allowed', true, 'remaining', -1);
  END IF;

  -- Determine monthly limit based on plan
  IF v_plan = 'pro' THEN
    v_monthly_limit := 500;
  ELSE
    v_monthly_limit := 100;
  END IF;

  -- Count usage this month
  v_month_start := date_trunc('month', now());
  SELECT COALESCE(SUM(cost), 0) INTO v_monthly_used
  FROM public.credit_usage
  WHERE user_id = p_user_id
    AND created_at >= v_month_start;

  -- Check limit
  IF v_monthly_used + p_cost > v_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'INSUFFICIENT_CREDITS',
      'used', v_monthly_used,
      'limit', v_monthly_limit
    );
  END IF;

  -- Deduct
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

-- ---------------------------------------------------------------------------
-- 7. updated_at trigger for users.plan changes
-- ---------------------------------------------------------------------------
-- (already covered by trg_users_updated_at from 001)
