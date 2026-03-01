-- =============================================================================
-- 004_reading_progress.sql
-- Linkbrain v2 - Reading Progress Tracking
-- =============================================================================
-- Depends on: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: reading_progress
-- Tracks per-user scroll position and time spent on each clip.
-- Composite PK (clip_id, user_id) ensures one progress record per pair.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_progress (
    clip_id             UUID        NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (clip_id, user_id),

    -- Scroll depth as a percentage (0–100)
    scroll_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (scroll_percentage >= 0 AND scroll_percentage <= 100),

    -- Cumulative seconds the user has spent reading the clip
    time_spent_seconds  INTEGER     NOT NULL DEFAULT 0
                        CHECK (time_spent_seconds >= 0),

    -- NULL until the user reaches 100 % or explicitly marks as read
    completed_at        TIMESTAMPTZ,

    -- Updated on every progress sync from the client
    last_read_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.reading_progress IS 'Per-user reading progress state for each clip.';
COMMENT ON COLUMN public.reading_progress.scroll_percentage  IS 'Deepest scroll position reached, 0–100 %.';
COMMENT ON COLUMN public.reading_progress.time_spent_seconds IS 'Total active reading time accumulated across sessions.';
COMMENT ON COLUMN public.reading_progress.completed_at       IS 'Timestamp when the clip was first marked as fully read.';

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- Fetch all in-progress clips for a user (dashboard / continue reading)
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id
    ON public.reading_progress(user_id);

-- Find users who have read a specific clip (analytics / social proof)
CREATE INDEX IF NOT EXISTS idx_reading_progress_clip_id
    ON public.reading_progress(clip_id);

-- Filter to incomplete reads for a user (scroll_percentage < 100)
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_incomplete
    ON public.reading_progress(user_id, scroll_percentage)
    WHERE completed_at IS NULL;
