-- =============================================================================
-- 028_notification_tables.sql
-- Push notification preferences + notification log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. notification_preferences — per-user push notification settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Content notifications
  clip_analyzed       BOOLEAN     NOT NULL DEFAULT true,
  reminder            BOOLEAN     NOT NULL DEFAULT true,
  insights_ready      BOOLEAN     NOT NULL DEFAULT true,
  -- Social notifications
  collaboration       BOOLEAN     NOT NULL DEFAULT true,
  unread_clips        BOOLEAN     NOT NULL DEFAULT true,
  -- System notifications
  credit_low          BOOLEAN     NOT NULL DEFAULT true,
  credit_granted      BOOLEAN     NOT NULL DEFAULT true,
  updates             BOOLEAN     NOT NULL DEFAULT true,
  -- Quiet hours (local time stored; client converts to UTC)
  quiet_hours_start   TIME        NOT NULL DEFAULT '22:00',
  quiet_hours_end     TIME        NOT NULL DEFAULT '08:00',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.notification_preferences IS 'Per-user push notification preferences and quiet-hours settings.';

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON public.notification_preferences
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY notification_preferences_insert ON public.notification_preferences
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY notification_preferences_update ON public.notification_preferences
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_preferences_updated_at();

-- ---------------------------------------------------------------------------
-- 2. notification_log — record of every push notification sent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_log (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type      TEXT        NOT NULL,
  title     TEXT        NOT NULL,
  body      TEXT,
  data      JSONB,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at   TIMESTAMPTZ
);

COMMENT ON TABLE public.notification_log IS 'Log of push notifications sent to users. Used for in-app notification history and dedup checks.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_user_sent
  ON public.notification_log (user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_type_sent
  ON public.notification_log (user_id, type, sent_at DESC);

-- RLS — users can only SELECT their own logs (service inserts via supabaseAdmin)
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_log_select ON public.notification_log
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY notification_log_update ON public.notification_log
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
