/**
 * Syncs Supabase auth token to App Groups UserDefaults
 * so Share Extension can use it for API calls.
 */
import { isNative } from '@/lib/platform';
import { supabase } from '@/lib/supabase/client';

export async function syncAuthTokenToAppGroups() {
  if (!isNative) return;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) return;

    // Use Capacitor Preferences to write to App Groups UserDefaults
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.configure({ group: 'group.com.linkbrain.app' });
    await Preferences.set({ key: 'supabase_access_token', value: token });
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
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.configure({ group: 'group.com.linkbrain.app' });
    const { value } = await Preferences.get({ key: 'pending_clips' });

    if (!value) return;

    const pending = JSON.parse(value) as Array<{ url: string; note: string }>;
    if (pending.length === 0) return;

    // Process each pending clip
    for (const clip of pending) {
      try {
        await fetch('/api/v1/clips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: clip.url, notes: clip.note }),
        });
      } catch {
        // Will retry next app open
        return;
      }
    }

    // Clear pending queue after successful processing
    await Preferences.remove({ key: 'pending_clips' });
  } catch {
    // Silent fail
  }
}
