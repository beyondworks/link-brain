/**
 * API v1 - Clip Share
 *
 * POST   /api/v1/clips/:id/share  — 공개 공유 활성화 (share_token 생성)
 * DELETE /api/v1/clips/:id/share  — 공개 공유 비활성화
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import type { ClipData } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/** Generate an 8-char random token */
function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/**
 * POST /api/v1/clips/:id/share
 * Enable public sharing — generates a share_token if one doesn't exist yet.
 */
async function handleEnable(
  _req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const clipId = params.clipId;

  // Verify ownership
  const { data: existing, error: fetchError } = await db
    .from('clips')
    .select('id, share_token, is_public')
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (fetchError || !existing) {
    return errors.notFound('Clip');
  }

  const clip = existing as Pick<ClipData, 'id' | 'share_token' | 'is_public'>;

  // Reuse existing token if already shared
  const token = clip.share_token ?? generateShareToken();

  const { error: updateError } = await db
    .from('clips')
    .update({ is_public: true, share_token: token })
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId);

  if (updateError) {
    console.error('[API v1 Share] Enable error:', updateError);
    return errors.internalError();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return sendSuccess({ shareUrl: `${baseUrl}/s/${token}`, token });
}

/**
 * DELETE /api/v1/clips/:id/share
 * Disable public sharing — clears is_public and share_token.
 */
async function handleDisable(
  _req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const clipId = params.clipId;

  // Verify ownership
  const { data: existing, error: fetchError } = await db
    .from('clips')
    .select('id')
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (fetchError || !existing) {
    return errors.notFound('Clip');
  }

  const { error: updateError } = await db
    .from('clips')
    .update({ is_public: false, share_token: null })
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId);

  if (updateError) {
    console.error('[API v1 Share] Disable error:', updateError);
    return errors.internalError();
  }

  return sendSuccess({ shared: false });
}

const routeHandler = withAuth(
  async (req, auth, params = {}) => {
    if (req.method === 'POST') return handleEnable(req, auth, params);
    if (req.method === 'DELETE') return handleDisable(req, auth, params);
    return errors.methodNotAllowed(['POST', 'DELETE']);
  },
  { allowedMethods: ['POST', 'DELETE'] }
);

export const POST = routeHandler;
export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
