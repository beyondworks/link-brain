-- Admin RPC: server-side platform distribution aggregation
-- Replaces client-side 1000-row fetch in admin dashboard

CREATE OR REPLACE FUNCTION public.get_platform_distribution()
RETURNS TABLE(platform TEXT, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT platform, COUNT(*) AS count
  FROM public.clips
  WHERE platform IS NOT NULL
  GROUP BY platform
  ORDER BY count DESC
  LIMIT 20;
$$;

-- Only admins (service role) should call this
REVOKE ALL ON FUNCTION public.get_platform_distribution() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_distribution() TO service_role;

-- Admin RPC: user clip counts (server-side aggregation)
-- Replaces client-side full table scan in admin users page
CREATE OR REPLACE FUNCTION public.get_user_clip_counts(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, clip_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT c.user_id, COUNT(*) AS clip_count
  FROM public.clips c
  WHERE c.user_id = ANY(p_user_ids)
  GROUP BY c.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_clip_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_clip_counts(UUID[]) TO service_role;
