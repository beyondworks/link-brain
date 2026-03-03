'use client';

import { useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ReadingProgressData {
  clip_id: string;
  scroll_percentage: number;
  time_spent_seconds: number;
  completed_at: string | null;
  last_read_at: string | null;
}

interface UpdateProgressParams {
  scroll_percentage?: number;
  time_spent_seconds?: number;
}

async function fetchProgress(clipId: string): Promise<ReadingProgressData> {
  const res = await fetch(`/api/v1/clips/${clipId}/progress`);
  if (!res.ok) throw new Error('읽기 진행률 로드 실패');
  const json = await res.json() as { success: boolean; data: ReadingProgressData };
  return json.data;
}

async function updateProgress(clipId: string, params: UpdateProgressParams): Promise<ReadingProgressData> {
  const res = await fetch(`/api/v1/clips/${clipId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('읽기 진행률 저장 실패');
  const json = await res.json() as { success: boolean; data: ReadingProgressData };
  return json.data;
}

export function useReadingProgress(clipId: string) {
  const queryClient = useQueryClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey: ['reading-progress', clipId],
    queryFn: () => fetchProgress(clipId),
    staleTime: 30_000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (params: UpdateProgressParams) => updateProgress(clipId, params),
    onSuccess: (data) => {
      queryClient.setQueryData(['reading-progress', clipId], data);
    },
  });

  // 5초 디바운스로 진행률 업데이트
  const debouncedUpdate = useCallback(
    (params: UpdateProgressParams) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        mutation.mutate(params);
      }, 5000);
    },
    [mutation]
  );

  return {
    progress: query.data,
    isLoading: query.isLoading,
    update: debouncedUpdate,
    updateImmediate: mutation.mutate,
  };
}
