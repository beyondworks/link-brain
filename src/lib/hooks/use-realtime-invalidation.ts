'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Opens a single Supabase Realtime channel that listens for postgres_changes
 * on all relevant tables, then invalidates the matching TanStack Query cache
 * keys so UI stays in sync across devices without manual refetches.
 *
 * Includes:
 * - clips, collections, categories, tags (core)
 * - clip_collections (junction — collection clip counts)
 * - clip_contents (content updates / analysis completion)
 * - highlights (highlight CRUD)
 * - Automatic reconnection on channel error
 *
 * Call this once at the app shell level (e.g. app layout).
 */
export function useRealtimeInvalidation(userId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const invalidate = useCallback(
    (...keys: string[]) => {
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!userId) return;

    const setupChannel = () => {
      // Clean up any existing channel before creating a new one
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`realtime-invalidation:${userId}`)
        // ── clips ──────────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clips', filter: `user_id=eq.${userId}` },
          (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => {
            // Always invalidate the clip list and nav counts
            invalidate('clips', 'nav-counts');
            // Heavy stats only needed when clip count changes (not on plain UPDATE)
            if (payload.eventType !== 'UPDATE') {
              invalidate(
                'clips-count',
                'dashboard-stats',
                'weekly-stats',
                'continue-reading',
                'read-later-list',
                'duplicates',
                'recent-activity'
              );
            }
          }
        )
        // ── collections ────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
          () => {
            invalidate('collections', 'nav-counts');
          }
        )
        // ── categories ─────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
          () => {
            invalidate('categories');
          }
        )
        // ── tags (RLS-scoped, no client filter) ────────────────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tags' },
          () => {
            invalidate('tags', 'tags-with-count');
          }
        )
        // ── clip_collections (junction — no user_id, RLS) ──────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clip_collections' },
          () => {
            invalidate('collection-clips', 'collections', 'clip-collections');
          }
        )
        // ── clip_contents (analysis completion, content update) ─
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clip_contents' },
          () => {
            invalidate('clip', 'clips');
          }
        )
        // ── highlights ─────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'highlights' },
          () => {
            invalidate('highlights', 'all-annotations', 'annotations');
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            // Reconnect after a brief delay
            setTimeout(() => setupChannel(), 3000);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, invalidate]);
}
