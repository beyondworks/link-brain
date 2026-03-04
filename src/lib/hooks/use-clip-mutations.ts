'use client';

import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';

interface ClipPage {
  data: ClipData[];
  nextPage: number | null;
}

type ClipsInfiniteData = InfiniteData<ClipPage, number>;

function updateClipInInfiniteData(
  old: ClipsInfiniteData | undefined,
  clipId: string,
  updater: (clip: ClipData) => ClipData
): ClipsInfiniteData | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.map((clip) => (clip.id === clipId ? updater(clip) : clip)),
    })),
  };
}

function removeClipFromInfiniteData(
  old: ClipsInfiniteData | undefined,
  clipId: string
): ClipsInfiniteData | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.filter((clip) => clip.id !== clipId),
    })),
  };
}

// ─── Toggle Favorite ──────────────────────────────────────────────────────────

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, isFavorite }: { clipId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('clips')
        .update({ is_favorite: !isFavorite } as never)
        .eq('id', clipId);
      if (error) throw error;
      return { clipId, newValue: !isFavorite };
    },

    onMutate: async ({ clipId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      const previousEntries = queryClient.getQueriesData<ClipsInfiniteData>({
        queryKey: ['clips'],
      });

      queryClient.setQueriesData<ClipsInfiniteData>({ queryKey: ['clips'] }, (old) =>
        updateClipInInfiniteData(old, clipId, (clip) => ({
          ...clip,
          is_favorite: !isFavorite,
        }))
      );

      return { previousEntries };
    },

    onError: (_err, _vars, context) => {
      context?.previousEntries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('즐겨찾기 변경에 실패했습니다.');
    },

    onSuccess: (_data, { isFavorite }) => {
      toast.success(isFavorite ? '즐겨찾기에서 제거됨' : '즐겨찾기에 추가됨');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}

// ─── Toggle Archive ───────────────────────────────────────────────────────────

export function useToggleArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, isArchived }: { clipId: string; isArchived: boolean }) => {
      const { error } = await supabase
        .from('clips')
        .update({ is_archived: !isArchived } as never)
        .eq('id', clipId);
      if (error) throw error;
      return { clipId, newValue: !isArchived };
    },

    onMutate: async ({ clipId, isArchived }) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      const previousEntries = queryClient.getQueriesData<ClipsInfiniteData>({
        queryKey: ['clips'],
      });

      queryClient.setQueriesData<ClipsInfiniteData>({ queryKey: ['clips'] }, (old) =>
        updateClipInInfiniteData(old, clipId, (clip) => ({
          ...clip,
          is_archived: !isArchived,
        }))
      );

      return { previousEntries };
    },

    onError: (_err, _vars, context) => {
      context?.previousEntries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('아카이브 변경에 실패했습니다.');
    },

    onSuccess: (_data, { isArchived }) => {
      toast.success(isArchived ? '아카이브에서 제거됨' : '아카이브에 추가됨');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}

// ─── Toggle Pin ───────────────────────────────────────────────────────────────

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, isPinned }: { clipId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('clips')
        .update({ is_pinned: !isPinned } as never)
        .eq('id', clipId);
      if (error) throw error;
      return { clipId, newValue: !isPinned };
    },

    onMutate: async ({ clipId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      const previousEntries = queryClient.getQueriesData<ClipsInfiniteData>({
        queryKey: ['clips'],
      });

      queryClient.setQueriesData<ClipsInfiniteData>({ queryKey: ['clips'] }, (old) =>
        updateClipInInfiniteData(old, clipId, (clip) => ({
          ...clip,
          is_pinned: !isPinned,
        }))
      );

      return { previousEntries };
    },

    onError: (_err, _vars, context) => {
      context?.previousEntries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('고정 변경에 실패했습니다.');
    },

    onSuccess: (_data, { isPinned }) => {
      toast.success(isPinned ? '고정 해제됨' : '클립이 고정됨');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}

// ─── Delete Clip ──────────────────────────────────────────────────────────────

export function useDeleteClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId }: { clipId: string }) => {
      const { error } = await supabase.from('clips').delete().eq('id', clipId);
      if (error) throw error;
      return { clipId };
    },

    onMutate: async ({ clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      const previousEntries = queryClient.getQueriesData<ClipsInfiniteData>({
        queryKey: ['clips'],
      });

      queryClient.setQueriesData<ClipsInfiniteData>({ queryKey: ['clips'] }, (old) =>
        removeClipFromInfiniteData(old, clipId)
      );

      return { previousEntries };
    },

    onError: (_err, _vars, context) => {
      context?.previousEntries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('클립 삭제에 실패했습니다.');
    },

    onSuccess: () => {
      toast.success('클립이 삭제되었습니다.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}
