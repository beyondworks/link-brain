-- Add is_hidden column to clips table
-- Hidden clips are excluded from the home feed but remain accessible via filter
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering hidden clips efficiently
CREATE INDEX IF NOT EXISTS idx_clips_is_hidden
  ON public.clips (user_id, is_hidden)
  WHERE is_hidden = TRUE;
