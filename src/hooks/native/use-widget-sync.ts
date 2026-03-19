'use client';

import { useEffect } from 'react';
import { isNative } from '@/lib/platform';
import { useNavCounts } from '@/lib/hooks/use-nav-counts';
import { useClips } from '@/lib/hooks/use-clips';
import { syncRecentClipsToWidget, syncStatsToWidget } from '@/lib/native/widget-bridge';

/**
 * Syncs clip stats and recent clips to iOS widgets via App Group UserDefaults.
 * Runs whenever nav counts or clips data changes.
 */
export function useWidgetSync() {
  const { data: navCounts } = useNavCounts();
  const { data: clipsData } = useClips();

  // Sync stats to widget
  useEffect(() => {
    if (!isNative || !navCounts) return;

    syncStatsToWidget({
      totalClips: navCounts.total,
      todayClips: 0,
      favorites: navCounts.favorites,
    });
  }, [navCounts]);

  // Sync recent clips to widget
  useEffect(() => {
    if (!isNative || !clipsData?.pages?.[0]?.data) return;

    const recentClips = clipsData.pages[0].data.slice(0, 4).map((clip) => ({
      id: clip.id,
      title: clip.title || clip.url || '',
      platform: clip.platform || undefined,
      createdAt: clip.created_at || '',
    }));

    syncRecentClipsToWidget(recentClips);
  }, [clipsData]);
}
