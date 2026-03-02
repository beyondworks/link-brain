'use client';

import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';

interface ClipPage {
  data: ClipData[];
  nextPage: number | null;
}

type ClipsInfiniteData = InfiniteData<ClipPage, number>;

function updateRemindAtInInfiniteData(
  old: ClipsInfiniteData | undefined,
  clipId: string,
  remindAt: string | null
): ClipsInfiniteData | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.map((clip) =>
        clip.id === clipId ? { ...clip, remind_at: remindAt } : clip
      ),
    })),
  };
}

/**
 * useSetReminder — POST /api/v1/clips/:id/reminder
 * remind_at 설정 + optimistic update (InfiniteData<ClipPage> 패턴)
 */
export function useSetReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clipId,
      remindAt,
    }: {
      clipId: string;
      remindAt: string;
    }) => {
      const res = await fetch(`/api/v1/clips/${clipId}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remind_at: remindAt }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? '리마인더 설정에 실패했습니다.');
      }
      const json = (await res.json()) as { data: { remindAt: string } };
      return json.data.remindAt;
    },

    onMutate: async ({ clipId, remindAt }) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      const previousEntries = queryClient.getQueriesData<ClipsInfiniteData>({
        queryKey: ['clips'],
      });

      queryClient.setQueriesData<ClipsInfiniteData>({ queryKey: ['clips'] }, (old) =>
        updateRemindAtInInfiniteData(old, clipId, remindAt)
      );

      // 단일 클립 캐시도 업데이트
      queryClient.setQueryData<ClipData & { clip_contents: unknown[] }>(
        ['clip', clipId],
        (old) => (old ? { ...old, remind_at: remindAt } : old)
      );

      return { previousEntries };
    },

    onError: (err, { clipId }, context) => {
      context?.previousEntries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      queryClient.setQueryData<ClipData & { clip_contents: unknown[] }>(
        ['clip', clipId],
        (old) => (old ? { ...old, remind_at: null } : old)
      );
      toast.error(err instanceof Error ? err.message : '리마인더 설정에 실패했습니다.');
    },

    onSuccess: () => {
      toast.success('리마인더가 설정되었습니다.');
    },

    onSettled: (_data, _err, { clipId }) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clip', clipId] });
    },
  });
}

/**
 * useCancelReminder — DELETE /api/v1/clips/:id/reminder
 * remind_at 취소 + optimistic update
 */
export function useCancelReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId }: { clipId: string }) => {
      const res = await fetch(`/api/v1/clips/${clipId}/reminder`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? '리마인더 취소에 실패했습니다.');
      }
    },

    onMutate: async ({ clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      const previousEntries = queryClient.getQueriesData<ClipsInfiniteData>({
        queryKey: ['clips'],
      });

      queryClient.setQueriesData<ClipsInfiniteData>({ queryKey: ['clips'] }, (old) =>
        updateRemindAtInInfiniteData(old, clipId, null)
      );

      // 단일 클립 캐시도 업데이트
      const previousClip = queryClient.getQueryData<ClipData & { clip_contents: unknown[] }>(
        ['clip', clipId]
      );
      queryClient.setQueryData<ClipData & { clip_contents: unknown[] }>(
        ['clip', clipId],
        (old) => (old ? { ...old, remind_at: null } : old)
      );

      return { previousEntries, previousClip };
    },

    onError: (err, { clipId }, context) => {
      context?.previousEntries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousClip) {
        queryClient.setQueryData(['clip', clipId], context.previousClip);
      }
      toast.error(err instanceof Error ? err.message : '리마인더 취소에 실패했습니다.');
    },

    onSuccess: () => {
      toast.success('리마인더가 취소되었습니다.');
    },

    onSettled: (_data, _err, { clipId }) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clip', clipId] });
    },
  });
}
