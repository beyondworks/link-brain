'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import type { ImageAlbum, ClipData } from '@/types/database';

export function useImageAlbums() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['image-albums', user?.id],
    queryFn: async (): Promise<ImageAlbum[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('image_albums')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ImageAlbum[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useImageAlbum(albumId: string | null) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['image-album', albumId],
    queryFn: async () => {
      if (!albumId) return null;
      const { data, error } = await supabase
        .from('image_albums')
        .select('*')
        .eq('id', albumId)
        .single();
      if (error) throw error;
      return data as ImageAlbum;
    },
    enabled: !!albumId && !!user,
    staleTime: 60_000,
  });
}

export function useImageAlbumClips(albumId: string | null) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['image-album-clips', albumId],
    queryFn: async () => {
      if (!albumId) return [];
      const { data, error } = await supabase
        .from('image_album_clips')
        .select('clip_id, clips(*)')
        .eq('album_id', albumId);
      if (error) throw error;
      return data?.map((row: { clips: unknown }) => row.clips).filter(Boolean) as ClipData[] ?? [];
    },
    enabled: !!albumId && !!user,
    staleTime: 30_000,
  });
}

export function useImageClips() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['image-clips', user?.id],
    queryFn: async (): Promise<ClipData[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'image')
        .eq('is_archived', false)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClipData[];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const clips = query.state.data ?? [];
      const hasPending = clips.some(
        (c) => c.processing_status === 'pending' || c.processing_status === 'processing'
      );
      return hasPending ? 3_000 : false;
    },
  });
}

export function useImageClipsCount() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['image-clips-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('platform', 'image')
        .eq('is_archived', false)
        .eq('is_hidden', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
