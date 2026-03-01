'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';

export function useDeleteClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clipId: string) => {
      const { error } = await supabase
        .from('clips')
        .delete()
        .eq('id', clipId);

      if (error) throw error;
      return clipId;
    },
    onMutate: async (clipId) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      queryClient.setQueriesData<{ pages: { data: ClipData[] }[] }>(
        { queryKey: ['clips'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((clip) => clip.id !== clipId),
            })),
          };
        }
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.error('클립 삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('클립이 삭제되었습니다');
    },
  });
}
