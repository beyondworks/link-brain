'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';

export function useUpdateClipCategory() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ clipId, categoryId }: { clipId: string; categoryId: string | null }) => {
      if (!user?.id) throw new Error('인증이 필요합니다');

      const { error } = await supabase
        .from('clips')
        .update({ category_id: categoryId })
        .eq('id', clipId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ clipId, categoryId }) => {
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
                clip.id === clipId ? { ...clip, category_id: categoryId } : clip
              ),
            })),
          };
        }
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.error('카테고리 변경 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('카테고리가 변경되었습니다');
    },
  });
}
