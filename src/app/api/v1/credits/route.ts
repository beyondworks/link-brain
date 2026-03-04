/**
 * API v1 - Credits
 *
 * GET /api/v1/credits - Return the authenticated user's credit balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { getCreditBalance } from '@/lib/services/credit-service';

async function handleGetCredits(
  _req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const balance = await getCreditBalance(auth.publicUserId);
  return sendSuccess(balance);
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleGetCredits(req, auth);
    return errors.methodNotAllowed(['GET']);
  },
  { allowedMethods: ['GET'] }
);

export const GET = routeHandler;
export const OPTIONS = routeHandler;
