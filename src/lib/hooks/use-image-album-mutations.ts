'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { ImageAlbum } from '@/types/database';

// ─── Create Album ────────────────────────────────────────────────────────────

export function useCreateImageAlbum() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      color,
    }: {
      name: string;
      description?: string;
      color?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('image_albums')
        .insert({
          user_id: user.id,
          name,
          description: description ?? null,
          color: color ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as ImageAlbum;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-albums'] });
      toast.success('앨범이 생성되었습니다');
    },
    onError: () => toast.error('앨범 생성에 실패했습니다'),
  });
}

// ─── Update Album ────────────────────────────────────────────────────────────

export function useUpdateImageAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      albumId,
      name,
      description,
      color,
    }: {
      albumId: string;
      name: string;
      description?: string | null;
      color?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('image_albums')
        .update({ name, description: description ?? null, color: color ?? null } as never)
        .eq('id', albumId)
        .select()
        .single();
      if (error) throw error;
      return data as ImageAlbum;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-albums'] });
      queryClient.invalidateQueries({ queryKey: ['image-album'] });
      toast.success('앨범이 수정되었습니다');
    },
    onError: () => toast.error('앨범 수정에 실패했습니다'),
  });
}

// ─── Delete Album ────────────────────────────────────────────────────────────

export function useDeleteImageAlbum() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ albumId }: { albumId: string }) => {
      const { error } = await supabase
        .from('image_albums')
        .delete()
        .eq('id', albumId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-albums'] });
      toast.success('앨범이 삭제되었습니다');
      router.push('/images');
    },
    onError: () => toast.error('앨범 삭제에 실패했습니다'),
  });
}

// ─── Add Clip to Album ──────────────────────────────────────────────────────

export function useAddClipToAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ albumId, clipId }: { albumId: string; clipId: string }) => {
      const { error } = await supabase
        .from('image_album_clips')
        .insert({ album_id: albumId, clip_id: clipId } as never);
      if (error) throw error;
    },
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({ queryKey: ['image-album-clips', albumId] });
      queryClient.invalidateQueries({ queryKey: ['image-albums'] });
      toast.success('이미지가 앨범에 추가되었습니다');
    },
    onError: () => toast.error('이미지 추가에 실패했습니다'),
  });
}

// ─── Remove Clip from Album ─────────────────────────────────────────────────

export function useRemoveClipFromAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ albumId, clipId }: { albumId: string; clipId: string }) => {
      const { error } = await supabase
        .from('image_album_clips')
        .delete()
        .eq('album_id', albumId)
        .eq('clip_id', clipId);
      if (error) throw error;
    },
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({ queryKey: ['image-album-clips', albumId] });
      toast.success('이미지가 앨범에서 제거되었습니다');
    },
    onError: () => toast.error('이미지 제거에 실패했습니다'),
  });
}
