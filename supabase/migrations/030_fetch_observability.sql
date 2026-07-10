-- Fetch observability + processing status fixes
--
-- 1. Widen processing_status CHECK to allow 'partial'
--    (clip-service already writes 'partial' but the 010 CHECK rejected it silently)
-- 2. Add clips.fetch_method for fetch-pipeline observability
-- 3. Atomic failure marking RPC (replaces read-then-write retry_count race)

-- 1. Widen CHECK constraint
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_processing_status_check;
ALTER TABLE clips ADD CONSTRAINT clips_processing_status_check
  CHECK (processing_status IN ('pending', 'processing', 'ready', 'partial', 'failed'));

-- 2. Winning fetch method per clip (e.g. 'twitter:tweet-result', 'jina', 'og-meta')
ALTER TABLE clips ADD COLUMN IF NOT EXISTS fetch_method text;

-- 3. Atomic "mark failed" — increments retry_count in one statement
CREATE OR REPLACE FUNCTION mark_clip_failed(p_clip_id uuid, p_error text)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE clips
  SET processing_status = 'failed',
      processing_error = left(p_error, 500),
      retry_count = COALESCE(retry_count, 0) + 1
  WHERE id = p_clip_id;
$$;
