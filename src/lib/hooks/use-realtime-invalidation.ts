'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/**
 * Opens a single Supabase Realtime channel that listens for postgres_changes
 * on clips, collections, categories, and tags tables, then invalidates the
 * matching TanStack Query cache keys so UI stays in sync without manual refetches.
 *
 * Call this once at the app shell level (e.g. app layout).
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
          void queryClient.invalidateQueries({ queryKey: ['clips'] });
          // Credits balance changes when clips are analyzed; keep credit UI fresh.
          void queryClient.invalidateQueries({ queryKey: ['credits'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['collections'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
      )
      .on(
        'postgres_changes',
        // tags are scoped per-user in RLS; no client-side filter needed here.
        { event: '*', schema: 'public', table: 'tags' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['tags'] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
