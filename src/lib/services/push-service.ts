/**
 * Push Notification Service
 *
 * Sends APNs push notifications via HTTP/2 fetch.
 * Requires env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8, APNS_BUNDLE_ID
 * Gracefully skips if APNS_KEY_P8 is not configured.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface DeviceTokenRow {
  token: string;
  platform: string;
}

interface NotificationPrefsRow {
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface NotificationLogInsert {
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
}

// Cast for tables not yet in generated types
const db = supabaseAdmin as never as typeof supabaseAdmin;

// ---------------------------------------------------------------------------
// JWT signing for APNs (ES256)
// ---------------------------------------------------------------------------

async function buildApnsJwt(keyId: string, teamId: string, keyP8: string): Promise<string> {
  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Strip PEM armor and whitespace
  const pemBody = keyP8
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const keyBuffer = Buffer.from(pemBody, 'base64');

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    Buffer.from(signingInput)
  );

  const sig = Buffer.from(signature).toString('base64url');
  return `${signingInput}.${sig}`;
}

// ---------------------------------------------------------------------------
// Quiet hours check (UTC-based comparison against stored time values)
// ---------------------------------------------------------------------------

function isInQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const startMin = toMinutes(start);
  const endMin = toMinutes(end);

  // Quiet hours may wrap midnight (e.g., 22:00 to 08:00)
  if (startMin > endMin) {
    return nowMinutes >= startMin || nowMinutes < endMin;
  }
  return nowMinutes >= startMin && nowMinutes < endMin;
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

export async function sendPushNotification(
  userId: string,
  notification: PushNotification
): Promise<void> {
  const keyP8 = process.env.APNS_KEY_P8;
  if (!keyP8) {
    console.warn('[push-service] APNS_KEY_P8 not set — skipping push notification');
    return;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;

  if (!keyId || !teamId || !bundleId) {
    console.warn('[push-service] Missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_BUNDLE_ID — skipping');
    return;
  }

  // 1. Get device tokens (device_tokens is in generated types)
  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId)
    .eq('platform', 'ios') as { data: DeviceTokenRow[] | null; error: unknown };

  if (tokenError || !tokens || tokens.length === 0) {
    return;
  }

  // 2. Check quiet hours (notification_preferences not yet in generated types)
  const { data: prefs } = await db
    .from('notification_preferences' as never)
    .select('quiet_hours_start, quiet_hours_end')
    .eq('user_id', userId)
    .single() as unknown as { data: NotificationPrefsRow | null };

  if (prefs && isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
    return;
  }

  // 3. Build JWT
  let jwt: string;
  try {
    jwt = await buildApnsJwt(keyId, teamId, keyP8);
  } catch (err) {
    console.error('[push-service] JWT signing failed:', err);
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const apnsHost = isProduction
    ? 'https://api.push.apple.com'
    : 'https://api.sandbox.push.apple.com';

  const apnsPayload = {
    aps: {
      alert: { title: notification.title, body: notification.body },
      sound: 'default',
      badge: 1,
    },
    ...(notification.data ?? {}),
  };

  // 4. Send to each device token
  const sendResults = await Promise.allSettled(
    tokens.map(async ({ token }) => {
      const url = `${apnsHost}/3/device/${token}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `bearer ${jwt}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'content-type': 'application/json',
        },
        body: JSON.stringify(apnsPayload),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[push-service] APNs error for token ${token.slice(0, 8)}...: ${res.status} ${errBody}`);

        // Remove invalid/expired tokens
        if (res.status === 410 || res.status === 400) {
          await supabaseAdmin
            .from('device_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('token', token);
        }
      }
    })
  );

  const successCount = sendResults.filter((r) => r.status === 'fulfilled').length;

  // 5. Log to notification_log (not yet in generated types)
  if (successCount > 0) {
    const logRow: NotificationLogInsert = {
      user_id: userId,
      type: (notification.data?.type) ?? 'unknown',
      title: notification.title,
      body: notification.body ?? null,
      data: notification.data ?? null,
    };
    await db
      .from('notification_log' as never)
      .insert(logRow as never);
  }
}
