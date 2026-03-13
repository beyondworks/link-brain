-- =============================================================================
-- 018_image_albums.sql
-- Image Albums — folder-based organization for image clips
-- =============================================================================

-- 1. Create image_albums table
CREATE TABLE IF NOT EXISTS public.image_albums (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT,
  cover_image TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_albums_user
  ON public.image_albums (user_id, sort_order);

-- 2. Create join table for album-clip relationships
CREATE TABLE IF NOT EXISTS public.image_album_clips (
  album_id    UUID NOT NULL REFERENCES public.image_albums(id) ON DELETE CASCADE,
  clip_id     UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (album_id, clip_id)
);

CREATE INDEX IF NOT EXISTS idx_image_album_clips_clip
  ON public.image_album_clips (clip_id);

-- 3. RLS
ALTER TABLE public.image_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_album_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY image_albums_select ON public.image_albums
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY image_albums_insert ON public.image_albums
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY image_albums_update ON public.image_albums
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY image_albums_delete ON public.image_albums
  FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Join table policies
CREATE POLICY image_album_clips_select ON public.image_album_clips
  FOR SELECT USING (
    album_id IN (SELECT id FROM public.image_albums WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  );

CREATE POLICY image_album_clips_insert ON public.image_album_clips
  FOR INSERT WITH CHECK (
    album_id IN (SELECT id FROM public.image_albums WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  );

CREATE POLICY image_album_clips_delete ON public.image_album_clips
  FOR DELETE USING (
    album_id IN (SELECT id FROM public.image_albums WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  );

-- 4. updated_at trigger
CREATE TRIGGER trg_image_albums_updated_at
  BEFORE UPDATE ON public.image_albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
