'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

type WatchedTable = 'clips' | 'collections' | 'categories';

const TABLE_QUERY_KEYS: Record<WatchedTable, string[]> = {
  clips: ['clips'],
  collections: ['collections'],
  categories: ['categories'],
};

/**
 * Opens a single Supabase Realtime channel that listens for postgres_changes
 * on clips, collections, and categories tables, then invalidates the matching
 * TanStack Query cache keys so UI stays in sync without manual refetches.
 */
export function useRealtimeInvalidation(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime-invalidation:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clips', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEYS.clips });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEYS.collections });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEYS.categories });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
