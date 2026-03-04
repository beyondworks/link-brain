/**
 * OAuth Deauthorize Callback
 *
 * POST /api/v1/oauth/deauthorize
 * Called by Meta when a user removes the app from their Threads account.
 * Deletes the corresponding oauth_connection row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.formData().catch(() => null);
    const signedRequest = body?.get('signed_request');

    if (typeof signedRequest !== 'string') {
      return NextResponse.json({ success: true });
    }

    // signed_request = base64url(signature).base64url(payload)
    const [, payloadB64] = signedRequest.split('.');
    if (!payloadB64) {
      return NextResponse.json({ success: true });
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64').toString('utf-8'),
    ) as { user_id?: string };

    if (payload.user_id) {
      await db
        .from('oauth_connections')
        .delete()
        .eq('provider', 'threads')
        .eq('provider_user_id', payload.user_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[OAuth Deauthorize] Error:', err);
    // Always return 200 to Meta to avoid retries
    return NextResponse.json({ success: true });
  }
}

// Meta sends GET for verification during setup
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: true });
}
