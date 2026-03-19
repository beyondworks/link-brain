/**
 * Syncs Supabase auth token to App Groups UserDefaults
 * so Share Extension can use it for API calls.
 *
 * Uses WidgetBridge plugin's setAppGroupValue/getAppGroupValue
 * which writes to UserDefaults(suiteName: "group.com.linkbrain.app").
 */
import { isNative } from '@/lib/platform';
import { supabase } from '@/lib/supabase/client';
import { registerPlugin } from '@capacitor/core';

interface WidgetBridgePlugin {
  updateRecentClips(options: { clips: string }): Promise<{ success: boolean }>;
  updateStats(options: { totalClips: number; todayClips: number; favorites: number }): Promise<{ success: boolean }>;
  reloadWidgets(): Promise<{ success: boolean }>;
  setAppGroupValue(options: { key: string; value: string }): Promise<{ success: boolean }>;
  getAppGroupValue(options: { key: string }): Promise<{ value: string | null }>;
  removeAppGroupValue(options: { key: string }): Promise<{ success: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export async function syncAuthTokenToAppGroups() {
  if (!isNative) return;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) return;

    await WidgetBridge.setAppGroupValue({ key: 'supabase_access_token', value: token });
  } catch {
    // Silent fail — Share Extension will use pending queue as fallback
  }
}

/**
 * Check for pending clips saved by Share Extension while offline/unauthorized.
 * Process them into the app when the user opens it.
 */
export async function processPendingSharedClips() {
  if (!isNative) return;

  try {
    const { value } = await WidgetBridge.getAppGroupValue({ key: 'pending_clips' });

    if (!value) return;

    const pending = JSON.parse(value) as Array<{ url: string; note: string }>;
    if (pending.length === 0) return;

    for (const clip of pending) {
      try {
        await fetch('/api/v1/clips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: clip.url, notes: clip.note }),
        });
      } catch {
        return; // Will retry next app open
      }
    }

    await WidgetBridge.removeAppGroupValue({ key: 'pending_clips' });
  } catch {
    // Silent fail
  }
}
