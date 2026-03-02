'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import type { CreditBalance } from '@/lib/services/credit-service';

export function useCredits() {
  const { user } = useSupabase();

  return useQuery({
    queryKey: ['credits', user?.id],
    queryFn: async (): Promise<CreditBalance> => {
      const res = await fetch('/api/v1/credits');
      if (!res.ok) throw new Error('Failed to fetch credits');
      // API returns { success: true, data: CreditBalance }
      const json = (await res.json()) as { success: boolean; data: CreditBalance };
      return json.data;
    },
    enabled: !!user,
    staleTime: 60_000,      // 1 minute
    refetchInterval: 300_000, // 5 minutes
  });
}
