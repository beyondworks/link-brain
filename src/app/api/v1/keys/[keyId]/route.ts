/**
 * API v1 - API Key by ID
 *
 * DELETE /api/v1/keys/[keyId] — API 키 삭제(revoke)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { revokeApiKey } from '@/lib/api/api-key-auth';

/**
 * DELETE /api/v1/keys/[keyId]
 */
async function handleDelete(
  _req: NextRequest,
  auth: AuthContext,
  params?: Record<string, string>
): Promise<NextResponse> {
  const keyId = params?.keyId;
  if (!keyId) {
    return errors.invalidRequest('Missing keyId parameter.');
  }

  const success = await revokeApiKey(auth.userId, keyId);
  if (!success) {
    return errors.notFound('API key');
  }

  return sendSuccess(null, 204);
}

export const DELETE = withAuth(handleDelete, { allowedMethods: ['DELETE'] });
