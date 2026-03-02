'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import type { DuplicateGroup, DuplicatesResponse } from '@/app/api/v1/clips/duplicates/route';

export type { DuplicateGroup };

interface UseDuplicatesResult {
  groups: DuplicateGroup[];
  isLoading: boolean;
  isError: boolean;
  totalDuplicates: number;
  refetch: () => void;
}

export function useDuplicates(): UseDuplicatesResult {
  const { user } = useCurrentUser();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['duplicates', user?.id],
    queryFn: async (): Promise<DuplicatesResponse> => {
      const res = await fetch('/api/v1/clips/duplicates');
      if (!res.ok) {
        throw new Error(`Failed to fetch duplicates: ${res.status}`);
      }
      const json = (await res.json()) as { success: boolean; data: DuplicatesResponse };
      if (!json.success) {
        throw new Error('Duplicates API returned failure');
      }
      return json.data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    groups: data?.groups ?? [],
    totalDuplicates: data?.totalDuplicates ?? 0,
    isLoading,
    isError,
    refetch,
  };
}
