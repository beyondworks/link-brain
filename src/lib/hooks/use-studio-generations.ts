'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';

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
      if (!res.ok) throw new Error('Failed to save generation');
      const json = (await res.json()) as { data: StudioGeneration };
      return json.data;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<StudioGeneration[]>(QUERY_KEY, (old) =>
        old ? [newItem, ...old].slice(0, 50) : [newItem]
      );
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
