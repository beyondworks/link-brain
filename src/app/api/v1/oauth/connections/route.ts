/**
 * OAuth Connections — List and manage connected accounts
 *
 * GET    /api/v1/oauth/connections          — List connected accounts
 * DELETE /api/v1/oauth/connections?provider=threads — Disconnect an account
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';
import { listConnections, removeConnection } from '@/lib/oauth/token-manager';
import type { OAuthProvider } from '@/types/database';

// Only providers with active OAuth support (must match authorize route)
const VALID_PROVIDERS: OAuthProvider[] = ['threads'];

async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
): Promise<NextResponse> {
  try {
    const connections = await listConnections(auth.publicUserId);
    return sendSuccess(connections);
  } catch (err) {
    console.error('[OAuth Connections] List error:', err);
    return errors.internalError();
  }
}

async function handleDelete(
  req: NextRequest,
  auth: AuthContext,
): Promise<NextResponse> {
  const provider = req.nextUrl.searchParams.get('provider');

  if (!provider || !VALID_PROVIDERS.includes(provider as OAuthProvider)) {
    return sendError(
      ErrorCodes.INVALID_REQUEST,
      `Invalid provider. Valid: ${VALID_PROVIDERS.join(', ')}`,
      400,
    );
  }

  try {
    await removeConnection(auth.publicUserId, provider as OAuthProvider);
    return sendSuccess({ message: `${provider} connection removed` });
  } catch (err) {
    console.error('[OAuth Connections] Delete error:', err);
    return errors.internalError();
  }
}

const handler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleGet(req, auth);
    if (req.method === 'DELETE') return handleDelete(req, auth);
    return errors.methodNotAllowed(['GET', 'DELETE']);
  },
  { allowedMethods: ['GET', 'DELETE'] },
);

export const GET = handler;
export const DELETE = handler;
export const OPTIONS = handler;
