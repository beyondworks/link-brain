'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';

export interface Highlight {
  id: string;
  clip_id: string;
  user_id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note: string | null;
  created_at: string;
}

interface CreateHighlightInput {
  text: string;
  startOffset: number;
  endOffset: number;
  color?: string;
  note?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

async function fetchHighlights(clipId: string): Promise<Highlight[]> {
  const res = await fetch(`/api/v1/clips/${clipId}/highlights`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch highlights: ${text}`);
  }
  const json = (await res.json()) as ApiSuccess<Highlight[]>;
  return json.data ?? [];
}

async function createHighlight(
  clipId: string,
  input: CreateHighlightInput
): Promise<Highlight> {
  const res = await fetch(`/api/v1/clips/${clipId}/highlights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create highlight: ${text}`);
  }
  const json = (await res.json()) as ApiSuccess<Highlight>;
  return json.data;
}

async function deleteHighlight(
  clipId: string,
  highlightId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/clips/${clipId}/highlights?highlightId=${highlightId}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete highlight: ${text}`);
  }
}

/**
 * 클립의 하이라이트 목록을 조회합니다.
 */
export function useHighlights(clipId: string) {
  const { user } = useSupabase();

  return useQuery({
    queryKey: ['highlights', clipId],
    queryFn: () => fetchHighlights(clipId),
    enabled: !!clipId && !!user,
    staleTime: 60_000,
  });
}

/**
 * 새 하이라이트를 생성합니다. optimistic update 포함.
 */
export function useCreateHighlight(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateHighlightInput) => createHighlight(clipId, input),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['highlights', clipId] });
      const previous = queryClient.getQueryData<Highlight[]>(['highlights', clipId]);

      const optimistic: Highlight = {
        id: `optimistic-${Date.now()}`,
        clip_id: clipId,
        user_id: '',
        text: input.text,
        start_offset: input.startOffset,
        end_offset: input.endOffset,
        color: input.color ?? 'yellow',
        note: input.note ?? null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Highlight[]>(['highlights', clipId], (old) =>
        [...(old ?? []), optimistic].sort((a, b) => a.start_offset - b.start_offset)
      );

      return { previous };
    },

    onError: (_err, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['highlights', clipId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', clipId] });
    },
  });
}

/**
 * 하이라이트를 삭제합니다. optimistic update 포함.
 */
export function useDeleteHighlight(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (highlightId: string) => deleteHighlight(clipId, highlightId),

    onMutate: async (highlightId) => {
      await queryClient.cancelQueries({ queryKey: ['highlights', clipId] });
      const previous = queryClient.getQueryData<Highlight[]>(['highlights', clipId]);

      queryClient.setQueryData<Highlight[]>(['highlights', clipId], (old) =>
        (old ?? []).filter((h) => h.id !== highlightId)
      );

      return { previous };
    },

    onError: (_err, _highlightId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['highlights', clipId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', clipId] });
    },
  });
}
