import { registerPlugin } from '@capacitor/core';
import { isNative } from '@/lib/platform';

interface WidgetBridgePlugin {
  updateRecentClips(options: { clips: string }): Promise<{ success: boolean }>;
  updateStats(options: {
    totalClips: number;
    todayClips: number;
    favorites: number;
  }): Promise<{ success: boolean }>;
  reloadWidgets(): Promise<{ success: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export async function syncRecentClipsToWidget(
  clips: Array<{ id: string; title: string; platform?: string; createdAt: string }>
) {
  if (!isNative) return;
  try {
    await WidgetBridge.updateRecentClips({ clips: JSON.stringify(clips) });
  } catch {
    // Widget extension may not be installed yet
  }
}

export async function syncStatsToWidget(stats: {
  totalClips: number;
  todayClips: number;
  favorites: number;
}) {
  if (!isNative) return;
  try {
    await WidgetBridge.updateStats(stats);
  } catch {
    // Widget extension may not be installed yet
  }
}

export async function reloadAllWidgets() {
  if (!isNative) return;
  try {
    await WidgetBridge.reloadWidgets();
  } catch {
    // Widget extension may not be installed yet
  }
}
