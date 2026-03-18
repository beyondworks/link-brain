'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { toast } from 'sonner';

export interface StudioGeneration {
  id: string;
  content_type: string;
  tone: string;
  length: string;
  source_clip_ids: string[];
  output: string;
  created_at: string;
}

const QUERY_KEY = ['studio-generations'];

export function useStudioGenerations() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<StudioGeneration[]> => {
      const res = await fetch('/api/v1/studio-generations');
      if (!res.ok) throw new Error('Failed to fetch generations');
      const json = (await res.json()) as { data: StudioGeneration[] };
      return json.data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useSaveGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      content_type: string;
      tone: string;
      length: string;
      source_clip_ids: string[];
      output: string;
    }): Promise<StudioGeneration> => {
      const res = await fetch('/api/v1/studio-generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null) as {
          error?: { code?: string; message?: string } | string;
        } | null;
        const errObj = errData?.error;
        const message =
          typeof errObj === 'object' ? (errObj?.message ?? '저장에 실패했습니다.') : (errObj ?? '저장에 실패했습니다.');
        const code = typeof errObj === 'object' ? errObj?.code : undefined;
        const err = new Error(message);
        (err as Error & { code?: string }).code = code;
        throw err;
      }
      const json = (await res.json()) as { data: StudioGeneration };
      return json.data;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<StudioGeneration[]>(QUERY_KEY, (old) =>
        old ? [newItem, ...old].slice(0, 50) : [newItem]
      );
    },
    onError: (err: unknown) => {
      const error = err as Error & { code?: string };
      if (error.code === 'INSUFFICIENT_CREDITS' || error.code === 'STUDIO_LIMIT_REACHED') {
        toast.error('이번 달 스튜디오 생성 한도에 도달했습니다.', {
          action: { label: 'Pro 업그레이드', onClick: () => { window.location.href = '/pricing'; } },
        });
      } else {
        toast.error('생성 기록 저장에 실패했습니다. 결과는 현재 세션에서 확인할 수 있습니다.');
      }
    },
  });
}

export function useDeleteGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/studio-generations?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete generation');
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<StudioGeneration[]>(QUERY_KEY, (old) =>
        old ? old.filter((g) => g.id !== id) : []
      );
    },
  });
}
