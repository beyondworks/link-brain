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
  } catch (error) {
    console.warn('[ShareExt] syncAuthToken failed:', error);
  }
}

/**
 * Check if Share Extension just shared a clip.
 * Reads and clears the last_shared_url flag (written by ShareViewController).
 * Returns the URL if shared within the last 30 seconds, null otherwise.
 */
export async function checkSharedClipFlag(): Promise<string | null> {
  if (!isNative) return null;

  try {
    const [urlResult, atResult] = await Promise.all([
      WidgetBridge.getAppGroupValue({ key: 'last_shared_url' }),
      WidgetBridge.getAppGroupValue({ key: 'last_shared_at' }),
    ]);

    if (!urlResult.value || !atResult.value) return null;

    const sharedAt = parseFloat(atResult.value);
    const now = Date.now() / 1000;

    // Only show toast if shared within the last 30 seconds
    if (now - sharedAt > 30) return null;

    // Clear the flag so it doesn't show again
    await Promise.all([
      WidgetBridge.removeAppGroupValue({ key: 'last_shared_url' }),
      WidgetBridge.removeAppGroupValue({ key: 'last_shared_at' }),
    ]);

    return urlResult.value;
  } catch (error) {
    console.warn('[ShareExt] checkSharedClipFlag failed:', error);
    return null;
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
      } catch (error) {
        console.warn('[ShareExt] processPending clip failed:', error);
        return; // Will retry next app open
      }
    }

    await WidgetBridge.removeAppGroupValue({ key: 'pending_clips' });
  } catch (error) {
    console.warn('[ShareExt] processPendingSharedClips failed:', error);
  }
}
