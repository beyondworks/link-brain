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
}

export function useNavCounts() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['nav-counts', user?.id],
    queryFn: async (): Promise<NavCounts> => {
      if (!user) return { total: 0, favorites: 0, readLater: 0, archived: 0, collections: 0 };

      const [totalRes, favRes, readLaterRes, archivedRes, collectionsRes] = await Promise.all([
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_archived', false),
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_favorite', true),
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read_later', true),
        supabase
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_archived', true),
        supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      return {
        total: totalRes.count ?? 0,
        favorites: favRes.count ?? 0,
        readLater: readLaterRes.count ?? 0,
        archived: archivedRes.count ?? 0,
        collections: collectionsRes.count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
