/**
 * OAuth Callback — Handle provider redirect
 *
 * GET /api/v1/oauth/callback?code=...&state=...
 * Exchanges code for tokens, stores encrypted connection, redirects to settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensurePublicUser } from '@/lib/api/ensure-user';
import { storeOAuthConnection } from '@/lib/oauth/token-manager';
import { getThreadsProfile } from '@/lib/oauth/threads-api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Exchange authorization code for short-lived token.
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  user_id: string;
}> {
  const res = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.META_THREADS_APP_ID ?? '',
      client_secret: process.env.META_THREADS_APP_SECRET ?? '',
      grant_type: 'authorization_code',
      redirect_uri: `${APP_URL}/api/v1/oauth/callback`,
      code,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<{ access_token: string; user_id: string }>;
}

/**
 * Exchange short-lived token for long-lived token (60 days).
 */
async function exchangeForLongLived(shortToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const url = new URL('https://graph.threads.net/access_token');
  url.searchParams.set('grant_type', 'th_exchange_token');
  url.searchParams.set('client_secret', process.env.META_THREADS_APP_SECRET ?? '');
  url.searchParams.set('access_token', shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Long-lived token exchange failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // Handle user denial — clear state cookie before redirect
  if (errorParam) {
    const response = NextResponse.redirect(
      `${APP_URL}/settings?oauth=cancelled&error=${encodeURIComponent(errorParam)}`,
    );
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/v1/oauth',
    });
    return response;
  }

  // Validate state (CSRF protection)
  const storedState = req.cookies.get('oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${APP_URL}/settings?oauth=error&reason=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings?oauth=error&reason=missing_code`);
  }

  try {
    // Authenticate user from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${APP_URL}/login?redirect=/settings`);
    }

    const publicUserId = await ensurePublicUser(user.id);

    // Step 1: Exchange code for short-lived token
    const shortLived = await exchangeCodeForToken(code);

    // Step 2: Exchange for long-lived token
    const longLived = await exchangeForLongLived(shortLived.access_token);

    // Step 3: Get profile info and cross-check user identity
    const profile = await getThreadsProfile(longLived.access_token);

    if (String(shortLived.user_id) !== String(profile.id)) {
      return NextResponse.redirect(
        `${APP_URL}/settings?oauth=error&reason=user_id_mismatch`,
      );
    }

    // Step 4: Store encrypted connection
    await storeOAuthConnection({
      userId: publicUserId,
      provider: 'threads',
      providerUserId: profile.id,
      providerUsername: profile.username,
      accessToken: longLived.access_token,
      tokenExpiresIn: longLived.expires_in,
      scopes: ['threads_basic', 'threads_read_replies'],
    });

    // Clear state cookie and redirect to settings with success
    const response = NextResponse.redirect(`${APP_URL}/settings?oauth=success&provider=threads`);
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/v1/oauth',
    });

    return response;
  } catch (err) {
    console.error('[OAuth Callback] Error:', err);
    return NextResponse.redirect(
      `${APP_URL}/settings?oauth=error&reason=${encodeURIComponent(
        err instanceof Error ? err.message : 'unknown_error',
      )}`,
    );
  }
}
