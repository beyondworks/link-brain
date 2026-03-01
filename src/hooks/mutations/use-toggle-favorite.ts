'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, isFavorite }: { clipId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('clips')
        .update({ is_favorite: isFavorite })
        .eq('id', clipId);

      if (error) throw error;
      return { clipId, isFavorite };
    },
    onMutate: async ({ clipId, isFavorite }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      queryClient.setQueriesData<{ pages: { data: ClipData[] }[] }>(
        { queryKey: ['clips'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((clip) =>
                clip.id === clipId ? { ...clip, is_favorite: isFavorite } : clip
              ),
            })),
          };
        }
      );
    },
    onError: (_err, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.error(isFavorite ? '즐겨찾기 추가 실패' : '즐겨찾기 해제 실패');
    },
    onSuccess: (_data, { isFavorite }) => {
      toast.success(isFavorite ? '즐겨찾기에 추가됨' : '즐겨찾기 해제됨');
    },
  });
}
