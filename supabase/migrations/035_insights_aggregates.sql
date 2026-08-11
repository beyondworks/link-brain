-- =============================================================================
-- 035_insights_aggregates.sql
-- Linkbrain v2 - Insights period aggregation (single round trip)
-- =============================================================================
-- Depends on: 001_initial_schema.sql, 004_reading_progress.sql,
--             012_add_is_read_column.sql, 015_add_is_hidden_column.sql
--
-- Replaces the all-JS aggregation in GET /api/v1/insights for period stats.
-- One call returns: saved/read counts, daily activity, category + platform
-- distribution and the reading-debt list for the [p_from, p_to) window.
--
-- Read counting rule (fixes the "any edit re-counts" bug of updated_at):
--   reading_progress.last_read_at is the source of truth. clips.updated_at is
--   only consulted for clips that have NO progress row at all (legacy is_read).
--
-- All bucketing is done in UTC so the API and the client agree on day keys.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_insights_stats(
  p_user_id UUID,
  p_from    TIMESTAMPTZ,
  p_to      TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saved      INTEGER;
  v_read       INTEGER;
  v_debt_count INTEGER;
  v_activity   JSONB;
  v_categories JSONB;
  v_platforms  JSONB;
  v_debt_clips JSONB;
BEGIN
  -- ── Saved in window ──────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_saved
  FROM public.clips c
  WHERE c.user_id = p_user_id
    AND c.is_archived = false
    AND c.is_hidden = false
    AND c.created_at >= p_from
    AND c.created_at < p_to;

  -- ── Read in window ───────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_read
  FROM public.clips c
  LEFT JOIN public.reading_progress rp
    ON rp.clip_id = c.id AND rp.user_id = c.user_id
  WHERE c.user_id = p_user_id
    AND c.is_archived = false
    AND c.is_hidden = false
    AND (
      (rp.clip_id IS NOT NULL AND rp.last_read_at >= p_from AND rp.last_read_at < p_to)
      OR (rp.clip_id IS NULL AND c.is_read = true
          AND c.updated_at >= p_from AND c.updated_at < p_to)
    );

  -- ── Daily activity (sparse: only days with events) ───────────────────────
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'),
                                'saved', saved_count,
                                'read',  read_count)
             ORDER BY d
           ),
           '[]'::jsonb)
    INTO v_activity
  FROM (
    SELECT d, SUM(s) AS saved_count, SUM(r) AS read_count
    FROM (
      SELECT (c.created_at AT TIME ZONE 'UTC')::date AS d, 1 AS s, 0 AS r
      FROM public.clips c
      WHERE c.user_id = p_user_id
        AND c.is_archived = false
        AND c.is_hidden = false
        AND c.created_at >= p_from
        AND c.created_at < p_to

      UNION ALL

      SELECT (COALESCE(rp.last_read_at, c.updated_at) AT TIME ZONE 'UTC')::date AS d, 0, 1
      FROM public.clips c
      LEFT JOIN public.reading_progress rp
        ON rp.clip_id = c.id AND rp.user_id = c.user_id
      WHERE c.user_id = p_user_id
        AND c.is_archived = false
        AND c.is_hidden = false
        AND (
          (rp.clip_id IS NOT NULL AND rp.last_read_at >= p_from AND rp.last_read_at < p_to)
          OR (rp.clip_id IS NULL AND c.is_read = true
              AND c.updated_at >= p_from AND c.updated_at < p_to)
        )
    ) events
    GROUP BY d
  ) daily;

  -- ── Category distribution (saved in window) ──────────────────────────────
  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('name', name, 'count', n) ORDER BY n DESC),
           '[]'::jsonb)
    INTO v_categories
  FROM (
    SELECT cat.name AS name, COUNT(*) AS n
    FROM public.clips c
    LEFT JOIN public.categories cat ON cat.id = c.category_id
    WHERE c.user_id = p_user_id
      AND c.is_archived = false
      AND c.is_hidden = false
      AND c.created_at >= p_from
      AND c.created_at < p_to
    GROUP BY cat.name
    ORDER BY COUNT(*) DESC
    LIMIT 8
  ) cats;

  -- ── Platform distribution (saved in window) ──────────────────────────────
  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('platform', platform, 'count', n) ORDER BY n DESC),
           '[]'::jsonb)
    INTO v_platforms
  FROM (
    SELECT c.platform AS platform, COUNT(*) AS n
    FROM public.clips c
    WHERE c.user_id = p_user_id
      AND c.is_archived = false
      AND c.is_hidden = false
      AND c.platform IS NOT NULL
      AND c.created_at >= p_from
      AND c.created_at < p_to
    GROUP BY c.platform
    ORDER BY COUNT(*) DESC
    LIMIT 8
  ) plats;

  -- ── Reading debt: saved in window, never opened ──────────────────────────
  SELECT COUNT(*) INTO v_debt_count
  FROM public.clips c
  LEFT JOIN public.reading_progress rp
    ON rp.clip_id = c.id AND rp.user_id = c.user_id
  WHERE c.user_id = p_user_id
    AND c.is_archived = false
    AND c.is_hidden = false
    AND c.is_read = false
    AND rp.clip_id IS NULL
    AND c.created_at >= p_from
    AND c.created_at < p_to;

  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('id', id,
                                        'title', title,
                                        'created_at', created_at,
                                        'platform', platform)
                     ORDER BY created_at),
           '[]'::jsonb)
    INTO v_debt_clips
  FROM (
    SELECT c.id, c.title, c.created_at, c.platform
    FROM public.clips c
    LEFT JOIN public.reading_progress rp
      ON rp.clip_id = c.id AND rp.user_id = c.user_id
    WHERE c.user_id = p_user_id
      AND c.is_archived = false
      AND c.is_hidden = false
      AND c.is_read = false
      AND rp.clip_id IS NULL
      AND c.created_at >= p_from
      AND c.created_at < p_to
    ORDER BY c.created_at
    LIMIT 5
  ) debt;

  RETURN jsonb_build_object(
    'saved',      v_saved,
    'read',       v_read,
    'activity',   v_activity,
    'categories', v_categories,
    'platforms',  v_platforms,
    'debtCount',  v_debt_count,
    'debtClips',  v_debt_clips
  );
END;
$$;

COMMENT ON FUNCTION public.get_insights_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Insights page period aggregates for one user in [p_from, p_to). Reads are counted from reading_progress.last_read_at, falling back to clips.updated_at only when no progress row exists.';

-- Supporting indexes for the window scans
CREATE INDEX IF NOT EXISTS idx_clips_user_created_at
  ON public.clips (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_last_read
  ON public.reading_progress (user_id, last_read_at DESC);

-- Server-side only: the function trusts p_user_id, so it must never be
-- reachable by an authenticated client that could pass someone else's id.
REVOKE ALL ON FUNCTION public.get_insights_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_insights_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
