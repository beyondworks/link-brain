'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Collection } from '@/types/database';

// ─── Update Collection ────────────────────────────────────────────────────────

interface UpdateCollectionVars {
  collectionId: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ collectionId, name, description, color }: UpdateCollectionVars) => {
      const { data, error } = await supabase
        .from('collections')
        .update({ name, description: description ?? null, color: color ?? null })
        .eq('id', collectionId)
        .select()
        .single();
      if (error) throw error;
      return data as Collection;
    },

    onMutate: async ({ collectionId, name, description, color }) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      await queryClient.cancelQueries({ queryKey: ['collection', collectionId] });

      const previousList = queryClient.getQueryData<Collection[]>(['collections', user?.id]);
      const previousDetail = queryClient.getQueryData<Collection>(['collection', collectionId]);

      queryClient.setQueryData<Collection[]>(['collections', user?.id], (old) =>
        old?.map((c) =>
          c.id === collectionId
            ? { ...c, name, description: description ?? null, color: color ?? null }
            : c
        )
      );

      queryClient.setQueryData<Collection>(['collection', collectionId], (old) =>
        old ? { ...old, name, description: description ?? null, color: color ?? null } : old
      );

      return { previousList, previousDetail };
    },

    onError: (_err, { collectionId }, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(['collections', user?.id], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(['collection', collectionId], context.previousDetail);
      }
      toast.error('컬렉션 수정에 실패했습니다.');
    },

    onSuccess: () => {
      toast.success('컬렉션이 수정되었습니다.');
    },

    onSettled: (_data, _err, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
    },
  });
}

// ─── Delete Collection ────────────────────────────────────────────────────────

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ collectionId }: { collectionId: string }) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);
      if (error) throw error;
      return { collectionId };
    },

    onMutate: async ({ collectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });

      const previousList = queryClient.getQueryData<Collection[]>(['collections', user?.id]);

      queryClient.setQueryData<Collection[]>(['collections', user?.id], (old) =>
        old?.filter((c) => c.id !== collectionId)
      );

      return { previousList };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(['collections', user?.id], context.previousList);
      }
      toast.error('컬렉션 삭제에 실패했습니다.');
    },

    onSuccess: () => {
      toast.success('컬렉션이 삭제되었습니다.');
      router.push('/collections');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

// ─── Remove Clip from Collection ─────────────────────────────────────────────

export function useRemoveClipFromCollection() {
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
        .delete()
        .eq('clip_id', clipId)
        .eq('collection_id', collectionId);
      if (error) throw error;
      return { clipId, collectionId };
    },

    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['collection-clips', collectionId] });
      toast.success('클립이 컬렉션에서 제거되었습니다.');
    },

    onError: () => {
      toast.error('클립 제거에 실패했습니다.');
    },
  });
}
