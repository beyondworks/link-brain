'use client';

import { useEffect } from 'react';
import { isNative } from '@/lib/platform';
import { syncAuthTokenToAppGroups, processPendingSharedClips } from '@/lib/native/share-extension-bridge';

/**
 * Syncs auth token to App Groups on app focus,
 * and processes any pending clips from Share Extension.
 */
export function useShareExtensionSync() {
  useEffect(() => {
    if (!isNative) return;

    // Sync on mount
    syncAuthTokenToAppGroups();
    processPendingSharedClips();

    // Re-sync when app returns to foreground
    const handleFocus = () => {
      syncAuthTokenToAppGroups();
      processPendingSharedClips();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);
}
