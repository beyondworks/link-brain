-- =============================================================================
-- 003_annotations.sql
-- Linkbrain v2 - Clip Annotations (Highlights & Notes)
-- =============================================================================
-- Depends on: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: clip_annotations
-- Stores user highlights and inline notes on saved clip content.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_annotations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id       UUID        NOT NULL REFERENCES public.clips(id)  ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,

    -- Annotation type
    type          TEXT        NOT NULL CHECK (type IN ('highlight', 'note', 'bookmark')),

    -- The text the user selected (may be NULL for pure bookmark annotations)
    selected_text TEXT,

    -- User's written note attached to the annotation (optional)
    note_text     TEXT,

    -- DOM / scroll position data so the UI can re-anchor the annotation
    -- Expected shape: { "startOffset": 123, "endOffset": 456, "xpath": "...", "scrollY": 789 }
    position_data JSONB,

    -- Visual colour used to render the highlight
    color         TEXT        NOT NULL DEFAULT 'yellow'
                              CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'purple', 'orange')),

    timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.clip_annotations IS 'User highlights and inline notes on clip content.';
COMMENT ON COLUMN public.clip_annotations.position_data IS
    'JSON anchor for the annotation: startOffset, endOffset, xpath, scrollY.';
COMMENT ON COLUMN public.clip_annotations.selected_text IS
    'The raw text the user highlighted; NULL for bookmark-type annotations.';

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- Primary access pattern: fetch all annotations for a clip by a specific user
CREATE INDEX IF NOT EXISTS idx_clip_annotations_clip_user
    ON public.clip_annotations(clip_id, user_id);

-- Secondary: list all annotations made by a user across all clips
CREATE INDEX IF NOT EXISTS idx_clip_annotations_user_id
    ON public.clip_annotations(user_id);

-- Filter by annotation type (highlight vs note vs bookmark)
CREATE INDEX IF NOT EXISTS idx_clip_annotations_type
    ON public.clip_annotations(clip_id, type);
