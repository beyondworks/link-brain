'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useMoveToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clipId,
      collectionId,
    }: {
      clipId: string;
      collectionId: string;
    }) => {
      const { error } = await supabase
        .from('clip_collections')
        .upsert({ clip_id: clipId, collection_id: collectionId } as never);

      if (error) throw error;
      return { clipId, collectionId };
    },
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['collection-clips', collectionId] });
      toast.success('컬렉션에 추가됨');
    },
    onError: () => {
      toast.error('컬렉션 추가 실패');
    },
  });
}
