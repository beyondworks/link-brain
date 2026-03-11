-- 012_add_is_read_column.sql
-- Add is_read column to clips table for tracking read status.

ALTER TABLE public.clips
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for weekly stats query (is_read = true, updated_at range)
CREATE INDEX IF NOT EXISTS idx_clips_user_read
    ON public.clips(user_id, is_read, updated_at)
    WHERE is_read = TRUE;
