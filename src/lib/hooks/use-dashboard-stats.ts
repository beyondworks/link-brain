'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';

export interface DashboardStats {
  totalClips: number;
  thisMonthClips: number;
  favoriteCount: number;
}

export function useDashboardStats() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) return { totalClips: 0, thisMonthClips: 0, favoriteCount: 0 };

      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      const [totalRes, monthRes, favRes] = await Promise.all([
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_archived', false),
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart),
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_favorite', true),
      ]);

      return {
        totalClips: totalRes.count ?? 0,
        thisMonthClips: monthRes.count ?? 0,
        favoriteCount: favRes.count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
