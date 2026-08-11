-- Explore popularity primitives
--
-- Explore is an anonymous public library: no saver identity is ever exposed.
-- Popularity therefore has to come from aggregate signals only:
--   1. views      — how many times a public clip page was opened
--   2. save_count — how many DISTINCT users saved the same URL
--
-- 1. increment_clip_views(p_clip_id)
--    Called fire-and-forget from the public clip page (/p/[clipId]).
--    Only public clips count; private clips are untouched.
CREATE OR REPLACE FUNCTION public.increment_clip_views(p_clip_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.clips
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_clip_id AND is_public = true;
$$;

COMMENT ON FUNCTION public.increment_clip_views(uuid) IS
  'Atomically bump clips.views for a public clip. No-op for private clips.';

-- 2. get_explore_popularity(p_urls)
--    Distinct savers per URL for one page of explore results.
--    Returns counts only — never user ids — so the caller cannot correlate
--    savers across clips.
CREATE OR REPLACE FUNCTION public.get_explore_popularity(p_urls text[])
RETURNS TABLE (url text, save_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT c.url, COUNT(DISTINCT c.user_id) AS save_count
  FROM public.clips c
  WHERE c.url = ANY(p_urls)
  GROUP BY c.url;
$$;

COMMENT ON FUNCTION public.get_explore_popularity(text[]) IS
  'Per-URL distinct saver counts for the explore feed. Aggregate only, no identities.';

-- Keeps the per-request popularity lookup (url = ANY(...)) off a seq scan.
CREATE INDEX IF NOT EXISTS idx_clips_url ON public.clips(url);

-- Server-side only. If these were PUBLIC, anonymous PostgREST callers could
-- inflate views (rank manipulation) or probe save counts for arbitrary URLs.
REVOKE ALL ON FUNCTION public.increment_clip_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_clip_views(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_explore_popularity(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_explore_popularity(text[]) TO service_role;
