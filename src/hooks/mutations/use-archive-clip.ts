'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';

export function useArchiveClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, isArchived }: { clipId: string; isArchived: boolean }) => {
      const { error } = await supabase
        .from('clips')
        .update({ is_archived: isArchived })
        .eq('id', clipId);

      if (error) throw error;
      return { clipId, isArchived };
    },
    onMutate: async ({ clipId, isArchived }) => {
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
                clip.id === clipId ? { ...clip, is_archived: isArchived } : clip
              ),
            })),
          };
        }
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.error('아카이브 처리 실패');
    },
    onSuccess: (_data, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success(isArchived ? '아카이브됨' : '아카이브 해제됨');
    },
  });
}
