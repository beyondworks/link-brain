CREATE OR REPLACE FUNCTION public.get_nav_counts(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_favorites INTEGER;
  v_read_later INTEGER;
  v_archived INTEGER;
  v_collections INTEGER;
  v_images INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.clips
  WHERE user_id = p_user_id AND is_archived = false AND is_hidden = false AND platform != 'image';

  SELECT COUNT(*) INTO v_favorites
  FROM public.clips
  WHERE user_id = p_user_id AND is_favorite = true AND platform != 'image';

  SELECT COUNT(*) INTO v_read_later
  FROM public.clips
  WHERE user_id = p_user_id AND is_read_later = true AND platform != 'image';

  SELECT COUNT(*) INTO v_archived
  FROM public.clips
  WHERE user_id = p_user_id AND is_archived = true;

  SELECT COUNT(*) INTO v_collections
  FROM public.collections
  WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_images
  FROM public.clips
  WHERE user_id = p_user_id AND platform = 'image' AND is_archived = false AND is_hidden = false;

  RETURN jsonb_build_object(
    'total', v_total,
    'favorites', v_favorites,
    'readLater', v_read_later,
    'archived', v_archived,
    'collections', v_collections,
    'images', v_images
  );
END;
$$;
