/**
 * POST /api/billing/portal
 *
 * Returns the Lemon Squeezy customer portal URL for the current user's subscription.
 * Requires authenticated user session with active subscription.
 *
 * Returns: { url: string }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCustomerPortalUrl } from '@/lib/lemonsqueezy';

const db = supabaseAdmin;

export async function POST(): Promise<NextResponse> {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get internal user ID
    const { data: userData } = await db
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription
    const { data: subData } = await db
      .from('subscriptions')
      .select('lemon_squeezy_id, status')
      .eq('user_id', (userData as { id: string }).id)
      .single();

    if (!subData || !(subData as { lemon_squeezy_id: string }).lemon_squeezy_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const portalUrl = await getCustomerPortalUrl(
      (subData as { lemon_squeezy_id: string }).lemon_squeezy_id
    );

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error('[Billing Portal] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get portal URL' },
      { status: 500 }
    );
  }
}
