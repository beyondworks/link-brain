/**
 * OAuth Authorize — Start OAuth flow
 *
 * GET /api/v1/oauth/authorize?provider=threads
 * Returns the authorization URL for the given provider.
 * Sets a state cookie for CSRF protection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';

const SUPPORTED_PROVIDERS = ['threads'] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

function isSupported(p: string): p is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(p);
}

function buildThreadsAuthUrl(state: string): string {
  const clientId = process.env.META_THREADS_APP_ID;
  if (!clientId) throw new Error('META_THREADS_APP_ID not configured');

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/oauth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'threads_basic,threads_read_replies',
    response_type: 'code',
    state,
  });

  return `https://threads.net/oauth/authorize?${params.toString()}`;
}

async function handleAuthorize(
  req: NextRequest,
  _auth: AuthContext,
): Promise<NextResponse> {
  const provider = req.nextUrl.searchParams.get('provider');

  if (!provider || !isSupported(provider)) {
    return sendError(
      ErrorCodes.INVALID_REQUEST,
      `Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
      400,
    );
  }

  try {
    // Check required env vars before starting flow
    if (provider === 'threads' && !process.env.META_THREADS_APP_ID) {
      return sendError(
        ErrorCodes.INVALID_REQUEST,
        'Threads OAuth가 아직 설정되지 않았습니다. META_THREADS_APP_ID 환경변수를 확인하세요.',
        503,
      );
    }

    // Generate CSRF state
    const state = crypto.randomUUID();

    let authUrl: string;
    switch (provider) {
      case 'threads':
        authUrl = buildThreadsAuthUrl(state);
        break;
      default:
        return sendError(ErrorCodes.INVALID_REQUEST, 'Provider not implemented', 400);
    }

    // Return auth URL + set state cookie
    const response = sendSuccess({ authUrl, provider });

    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/api/v1/oauth',
    });

    return response;
  } catch (err) {
    console.error('[OAuth Authorize] Error:', err);
    return errors.internalError();
  }
}

const handler = withAuth(handleAuthorize, { allowedMethods: ['GET'] });

export const GET = handler;
export const OPTIONS = handler;
