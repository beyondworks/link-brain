'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import type { WeeklyStatsData } from '@/app/api/v1/stats/weekly/route';

export type { WeeklyStatsData };

async function fetchWeeklyStats(): Promise<WeeklyStatsData> {
  const res = await fetch('/api/v1/stats/weekly');
  if (!res.ok) {
    throw new Error('주간 통계 로드 실패');
  }
  const json = (await res.json()) as { success: boolean; data: WeeklyStatsData };
  if (!json.success) {
    throw new Error('주간 통계 로드 실패');
  }
  return json.data;
}

export function useWeeklyStats() {
  const { user } = useCurrentUser();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['weekly-stats', user?.id],
    queryFn: fetchWeeklyStats,
    enabled: !!user,
    staleTime: 5 * 60_000, // 5분
    retry: false,
  });

  return { stats, isLoading };
}
