/**
 * API v1 - Clip Highlights
 *
 * GET    /api/v1/clips/[clipId]/highlights              - 클립의 하이라이트 목록 조회
 * POST   /api/v1/clips/[clipId]/highlights              - 새 하이라이트 저장
 * DELETE /api/v1/clips/[clipId]/highlights?highlightId= - 하이라이트 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';

type RouteContext = { params: Promise<Record<string, string>> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface HighlightRow {
  id: string;
  clip_id: string;
  user_id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note: string | null;
  created_at: string;
}

/**
 * 클립 소유권 확인 공통 헬퍼
 */
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
 * GET /api/v1/clips/[clipId]/highlights
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
      .from('highlights')
      .select('*')
      .eq('clip_id', clipId)
      .eq('user_id', auth.userId)
      .order('start_offset', { ascending: true });

    if (error) {
      // 테이블이 아직 없는 경우 graceful 처리
      if (
        error.code === 'PGRST116' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return sendSuccess([] as HighlightRow[]);
      }
      console.error('[API v1 Highlights] Fetch error:', error);
      return errors.internalError();
    }

    return sendSuccess((data as HighlightRow[]) ?? []);
  } catch (err) {
    console.error('[API v1 Highlights] Fetch error:', err);
    return errors.internalError();
  }
}

interface CreateHighlightBody {
  text: string;
  startOffset: number;
  endOffset: number;
  color?: string;
  note?: string;
}

/**
 * POST /api/v1/clips/[clipId]/highlights
 */
async function handlePost(
  req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  const ownership = await verifyClipOwnership(clipId, auth.userId);
  if (!ownership.ok) return ownership.response;

  let body: CreateHighlightBody;
  try {
    body = (await req.json()) as CreateHighlightBody;
  } catch {
    return errors.invalidRequest('Request body must be valid JSON');
  }

  const { text, startOffset, endOffset, color = 'yellow', note } = body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return errors.invalidRequest('text is required');
  }
  if (typeof startOffset !== 'number' || typeof endOffset !== 'number') {
    return errors.invalidRequest('startOffset and endOffset must be numbers');
  }
  if (startOffset >= endOffset) {
    return errors.invalidRequest('startOffset must be less than endOffset');
  }

  const VALID_COLORS = ['yellow', 'green', 'blue', 'red'];
  const normalizedColor = VALID_COLORS.includes(color) ? color : 'yellow';

  try {
    const { data, error } = await db
      .from('highlights')
      .insert({
        clip_id: clipId,
        user_id: auth.userId,
        text: text.trim(),
        start_offset: startOffset,
        end_offset: endOffset,
        color: normalizedColor,
        note: note ?? null,
      })
      .select()
      .single();

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return errors.internalError(
          'Highlights table does not exist. Please run database migrations.'
        );
      }
      console.error('[API v1 Highlights] Insert error:', error);
      return errors.internalError();
    }

    return sendSuccess(data as HighlightRow, 201);
  } catch (err) {
    console.error('[API v1 Highlights] Insert error:', err);
    return errors.internalError();
  }
}

/**
 * DELETE /api/v1/clips/[clipId]/highlights?highlightId=<id>
 */
async function handleDelete(
  req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  const ownership = await verifyClipOwnership(clipId, auth.userId);
  if (!ownership.ok) return ownership.response;

  const highlightId = req.nextUrl.searchParams.get('highlightId');
  if (!highlightId) {
    return errors.invalidRequest('highlightId query parameter is required');
  }

  try {
    const { error } = await db
      .from('highlights')
      .delete()
      .eq('id', highlightId)
      .eq('clip_id', clipId)
      .eq('user_id', auth.userId);

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return sendSuccess({ deleted: false });
      }
      console.error('[API v1 Highlights] Delete error:', error);
      return errors.internalError();
    }

    return sendSuccess({ deleted: true });
  } catch (err) {
    console.error('[API v1 Highlights] Delete error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');

    if (req.method === 'GET') return handleGet(req, auth, clipId);
    if (req.method === 'POST') return handlePost(req, auth, clipId);
    if (req.method === 'DELETE') return handleDelete(req, auth, clipId);
    return errors.methodNotAllowed(['GET', 'POST', 'DELETE']);
  },
  { allowedMethods: ['GET', 'POST', 'DELETE'] }
);

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
