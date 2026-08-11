'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import type { InsightsData } from '@/app/api/v1/insights/route';
import type { InsightsPeriod } from '@/lib/insights/period';

export type { InsightsData };

interface InsightsApiResponse {
  success: boolean;
  data: InsightsData;
}

export function useInsights(period: InsightsPeriod = 'month') {
  const { user } = useSupabase();

  return useQuery({
    queryKey: ['insights', user?.id, period],
    queryFn: async (): Promise<InsightsData> => {
      const res = await fetch(`/api/v1/insights?period=${period}`);
      if (!res.ok) {
        throw new Error(`Insights API error: ${res.status}`);
      }
      const json = (await res.json()) as InsightsApiResponse;
      if (!json.success) {
        throw new Error('Insights API returned failure');
      }
      return json.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    placeholderData: (prev) => prev, // keep the previous period visible while switching
  });
}
