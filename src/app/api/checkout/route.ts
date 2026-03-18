/**
 * POST /api/checkout
 *
 * Creates a Lemon Squeezy checkout URL for the Pro plan.
 * Requires authenticated user session.
 *
 * Body: { interval: 'monthly' | 'yearly' }
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createCheckout } from '@/lib/lemonsqueezy';
import type { User } from '@/types/database';

const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID ?? '';
const MONTHLY_VARIANT_ID = process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID ?? '';
const YEARLY_VARIANT_ID = process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID ?? '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get internal user
    const { data: userData } = await db
      .from('users')
      .select('id, email, plan')
      .eq('auth_id', authUser.id)
      .single();

    const user = userData as Pick<User, 'id' | 'email' | 'plan'> | null;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.plan === 'pro') {
      return NextResponse.json({ error: 'Already on Pro plan' }, { status: 400 });
    }

    // Parse body
    const body = await req.json() as { interval?: string };
    const interval = body.interval === 'yearly' ? 'yearly' : 'monthly';
    const variantId = interval === 'yearly' ? YEARLY_VARIANT_ID : MONTHLY_VARIANT_ID;

    if (!STORE_ID || !variantId) {
      console.error('[Checkout] Missing Lemon Squeezy env vars');
      return NextResponse.json(
        { error: 'Payment configuration not ready' },
        { status: 503 }
      );
    }

    const checkoutUrl = await createCheckout(
      STORE_ID,
      variantId,
      user.id,
      user.email
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
