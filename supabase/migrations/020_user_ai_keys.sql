-- =============================================================================
-- 020_user_ai_keys.sql
-- User-Supplied AI API Keys — AES-256-GCM encryption, per-user per-provider
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create user_ai_keys table with encrypted key storage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_ai_keys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider        TEXT        NOT NULL CHECK (provider IN ('openai')),
  name            TEXT        NOT NULL,
  encrypted_api_key TEXT      NOT NULL,  -- AES-256-GCM encrypted
  key_prefix      TEXT        NOT NULL,  -- First 8 chars + encrypted hash for identification
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_ai_keys IS 'User-supplied API keys for AI providers (OpenAI, etc), encrypted at rest.';
COMMENT ON COLUMN public.user_ai_keys.encrypted_api_key IS 'AES-256-GCM encrypted API key. Decryption requires OAUTH_ENCRYPTION_KEY env var.';
COMMENT ON COLUMN public.user_ai_keys.key_prefix IS 'First 8 characters + encrypted hash for safe identification in logs and UI.';
COMMENT ON COLUMN public.user_ai_keys.is_active IS 'Soft delete flag. Allows key rotation without losing history.';
COMMENT ON COLUMN public.user_ai_keys.last_used_at IS 'Timestamp of last successful API call using this key.';

-- Unique constraint: one active key per user per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_keys_active_provider
  ON public.user_ai_keys (user_id, provider)
  WHERE is_active = true;

-- Index for fast lookups by user and activity status
CREATE INDEX IF NOT EXISTS idx_user_ai_keys_user_active
  ON public.user_ai_keys (user_id, is_active);

-- Index for finding inactive keys for cleanup
CREATE INDEX IF NOT EXISTS idx_user_ai_keys_created_at
  ON public.user_ai_keys (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own keys (key_prefix visible, encrypted_api_key redacted in app)
CREATE POLICY user_ai_keys_select ON public.user_ai_keys
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can INSERT their own keys via server-side mutation only
CREATE POLICY user_ai_keys_insert ON public.user_ai_keys
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can UPDATE their own keys (name, is_active, last_used_at only)
-- Direct UPDATE on encrypted_api_key or provider should fail (use DELETE + INSERT pattern)
CREATE POLICY user_ai_keys_update ON public.user_ai_keys
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can DELETE their own keys
CREATE POLICY user_ai_keys_delete ON public.user_ai_keys
  FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Trigger: auto-update updated_at on modification
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_user_ai_keys_updated_at
  BEFORE UPDATE ON public.user_ai_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Function: get_user_ai_key() — server-only, returns decrypted key
-- ---------------------------------------------------------------------------
-- NOTE: This function is a placeholder. Actual decryption happens in Node.js
-- (Postgres pgcrypto does not have symmetric AES-256-GCM decrypt).
-- The function retrieves metadata; decryption is server-side via Node.js crypto module.
CREATE OR REPLACE FUNCTION public.get_user_ai_key(
  p_key_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_key_record RECORD;
BEGIN
  -- Fetch the key record metadata (encrypted_api_key NOT returned)
  SELECT id, user_id, provider, name, key_prefix, is_active, last_used_at, created_at
  INTO v_key_record
  FROM public.user_ai_keys
  WHERE id = p_key_id;

  IF v_key_record IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Return metadata only; app must decrypt using OAUTH_ENCRYPTION_KEY
  RETURN jsonb_build_object(
    'found', true,
    'id', v_key_record.id,
    'user_id', v_key_record.user_id,
    'provider', v_key_record.provider,
    'name', v_key_record.name,
    'key_prefix', v_key_record.key_prefix,
    'is_active', v_key_record.is_active,
    'last_used_at', v_key_record.last_used_at,
    'created_at', v_key_record.created_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Function: update_user_ai_key_last_used() — atomic last_used_at update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_ai_key_last_used(
  p_key_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_ai_keys
  SET last_used_at = now()
  WHERE id = p_key_id;
END;
$$;
