'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isNative } from '@/lib/platform';
import { supabase } from '@/lib/supabase/client';
import { syncAuthTokenToAppGroups, processPendingSharedClips } from '@/lib/native/share-extension-bridge';

/**
 * Syncs auth token to App Groups on app focus, auth state change,
 * processes pending clips from Share Extension,
 * and invalidates clips query so new shared clips appear immediately.
 */
export function useShareExtensionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNative) return;

    // Sync on mount
    syncAuthTokenToAppGroups();
    processPendingSharedClips();

    // Re-sync when app returns to foreground + refresh clips list
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncAuthTokenToAppGroups();
        processPendingSharedClips();
        // Refresh clips list so newly shared clips (with processing_status: pending) appear
        queryClient.invalidateQueries({ queryKey: ['clips'] });
        queryClient.invalidateQueries({ queryKey: ['nav-counts'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Re-sync on auth state change (TOKEN_REFRESHED, SIGNED_IN)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        syncAuthTokenToAppGroups();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      subscription.unsubscribe();
    };
  }, [queryClient]);
}
