/**
 * Lemon Squeezy Webhook Handler
 *
 * POST /api/webhooks/lemonsqueezy
 *
 * Handles subscription lifecycle events from Lemon Squeezy.
 * Updates the `subscriptions` table in Supabase.
 *
 * NOTE: In Next.js App Router, we read the raw body via req.text()
 * before JSON parsing to ensure accurate HMAC signature verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { User } from '@/types/database';

function getWebhookSecret(): string {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
  return secret;
}

// Escape strict Supabase generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// Lemon Squeezy event types
type LemonSqueezyEventName =
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'order_created';

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: LemonSqueezyEventName;
    custom_data?: {
      user_id?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id?: number;
      product_id: number;
      variant_id: number;
      status: string;
      cancelled: boolean;
      renews_at: string | null;
      ends_at: string | null;
      created_at: string;
      updated_at: string;
      user_email?: string;
      user_name?: string;
    };
  };
}

/**
 * Verify HMAC-SHA256 signature from Lemon Squeezy.
 */
function verifySignature(rawBody: string, signature: string): boolean {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    console.error('[LemonSqueezy] Missing LEMONSQUEEZY_WEBHOOK_SECRET');
    return false;
  }
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

/**
 * Map Lemon Squeezy status to app subscription status.
 */
function mapStatus(
  lsStatus: string,
  cancelled: boolean
): 'active' | 'cancelled' | 'past_due' | 'paused' {
  if (cancelled) return 'cancelled';
  switch (lsStatus) {
    case 'active':
    case 'on_trial':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return 'active';
  }
}

/**
 * Resolve the internal users.id (UUID) from Supabase auth UID.
 */
async function resolveInternalUserId(authUid: string): Promise<string | null> {
  const { data } = await db
    .from('users')
    .select('id')
    .eq('auth_id', authUid)
    .single();
  return data ? (data as Pick<User, 'id'>).id : null;
}

/**
 * Upsert the user's subscription record in Supabase.
 */
async function upsertSubscription(
  userId: string,
  payload: LemonSqueezyWebhookPayload,
  resolvedStatus: 'active' | 'cancelled' | 'past_due' | 'paused'
): Promise<void> {
  const attrs = payload.data.attributes;
  const tier: 'free' | 'pro' = resolvedStatus === 'active' ? 'pro' : 'free';

  const { error } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      tier,
      status: resolvedStatus,
      lemon_squeezy_id: payload.data.id,
      current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[LemonSqueezy] Failed to upsert subscription:', error);
    throw error;
  }

  // Sync users.plan column for fast tier lookup
  await db
    .from('users')
    .update({ plan: tier })
    .eq('id', userId);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read raw body BEFORE any parsing (needed for accurate HMAC)
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  if (!signature || !verifySignature(rawBody, signature)) {
    console.error('[LemonSqueezy] Invalid or missing signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: LemonSqueezyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const authUid = payload.meta.custom_data?.user_id;

  try {
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused': {
        if (!authUid) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
        }
        const userId = await resolveInternalUserId(authUid);
        if (!userId) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const status = mapStatus(
          payload.data.attributes.status,
          payload.data.attributes.cancelled
        );
        await upsertSubscription(userId, payload, status);
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_paused': {
        if (!authUid) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
        }
        const userId = await resolveInternalUserId(authUid);
        if (!userId) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const mappedStatus = eventName === 'subscription_paused' ? 'paused' : 'cancelled';
        await upsertSubscription(userId, payload, mappedStatus);
        break;
      }

      case 'subscription_expired': {
        if (!authUid) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
        }
        const userId = await resolveInternalUserId(authUid);
        if (!userId) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        await upsertSubscription(userId, payload, 'cancelled');
        break;
      }

      case 'order_created': {
        break;
      }

      default:
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[LemonSqueezy] Handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
