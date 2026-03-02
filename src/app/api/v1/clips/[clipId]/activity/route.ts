/**
 * API v1 - Clip Activity Log
 *
 * GET /api/v1/clips/[clipId]/activity - 클립의 활동 로그 조회 (최근 50개, 최신순)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';

type RouteContext = { params: Promise<Record<string, string>> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type ClipActivityAction =
  | 'created'
  | 'updated'
  | 'favorited'
  | 'unfavorited'
  | 'archived'
  | 'unarchived'
  | 'shared'
  | 'tag_added'
  | 'tag_removed'
  | 'collection_added'
  | 'collection_removed'
  | 'highlighted'
  | 'note_updated';

export interface ClipActivityRow {
  id: string;
  clip_id: string;
  user_id: string;
  action: ClipActivityAction;
  details: Record<string, unknown> | null;
  created_at: string;
}

async function verifyClipOwnership(
  clipId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) return { ok: false, response: errors.notFound('clip') };
  if ((clip as { user_id: string }).user_id !== userId)
    return { ok: false, response: errors.accessDenied() };

  return { ok: true };
}

/**
 * GET /api/v1/clips/[clipId]/activity
 */
async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  const ownership = await verifyClipOwnership(clipId, auth.userId);
  if (!ownership.ok) return ownership.response;

  try {
    const { data, error } = await db
      .from('clip_activity')
      .select('*')
      .eq('clip_id', clipId)
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // 테이블이 아직 없는 경우 graceful 처리
      if (
        error.code === 'PGRST116' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return sendSuccess([] as ClipActivityRow[]);
      }
      console.error('[API v1 Activity] Fetch error:', error);
      return errors.internalError();
    }

    return sendSuccess((data as ClipActivityRow[]) ?? []);
  } catch (err) {
    console.error('[API v1 Activity] Fetch error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');

    if (req.method === 'GET') return handleGet(req, auth, clipId);
    return errors.methodNotAllowed(['GET']);
  },
  { allowedMethods: ['GET'] }
);

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
