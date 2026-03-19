'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';

export interface NavCounts {
  total: number;
  favorites: number;
  readLater: number;
  archived: number;
  collections: number;
  images: number;
  today: number;
}

export function useNavCounts() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['nav-counts', user?.id],
    queryFn: async (): Promise<NavCounts> => {
      if (!user) return { total: 0, favorites: 0, readLater: 0, archived: 0, collections: 0, images: 0, today: 0 };

      const { data, error } = await supabase.rpc('get_nav_counts', {
        p_user_id: user.id,
      });

      if (error || !data) {
        return { total: 0, favorites: 0, readLater: 0, archived: 0, collections: 0, images: 0, today: 0 };
      }

      return data as unknown as NavCounts;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
