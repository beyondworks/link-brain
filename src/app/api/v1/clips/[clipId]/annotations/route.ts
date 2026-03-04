/**
 * API v1 - Clip Annotations
 *
 * GET  /api/v1/clips/[clipId]/annotations - 클립의 모든 주석 반환
 * POST /api/v1/clips/[clipId]/annotations - 새 하이라이트/메모 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import type { ClipAnnotation } from '@/types/database';

type RouteContext = { params: Promise<Record<string, string>> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * GET /api/v1/clips/[clipId]/annotations
 */
async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  // 클립 소유권 확인
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) return errors.notFound('clip');
  if ((clip as { user_id: string }).user_id !== auth.publicUserId) return errors.accessDenied();

  const { data, error } = await db
    .from('clip_annotations')
    .select('*')
    .eq('clip_id', clipId)
    .eq('user_id', auth.publicUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[API v1 Annotations] Fetch error:', error);
    return errors.internalError();
  }

  return sendSuccess((data as ClipAnnotation[]) ?? []);
}

interface CreateAnnotationBody {
  type: 'highlight' | 'note' | 'bookmark';
  selected_text?: string | null;
  note_text?: string | null;
  position_data?: {
    startOffset: number;
    endOffset: number;
    startPath: string;
    endPath: string;
  } | null;
  color?: string;
}

/**
 * POST /api/v1/clips/[clipId]/annotations
 */
async function handlePost(
  req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  // 클립 소유권 확인
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) return errors.notFound('clip');
  if ((clip as { user_id: string }).user_id !== auth.publicUserId) return errors.accessDenied();

  let body: CreateAnnotationBody;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Request body must be valid JSON');
  }

  const { type, selected_text, note_text, position_data, color } = body;

  if (!type || !['highlight', 'note', 'bookmark'].includes(type)) {
    return errors.invalidRequest('type must be highlight, note, or bookmark');
  }

  const { data, error } = await db
    .from('clip_annotations')
    .insert({
      clip_id: clipId,
      user_id: auth.publicUserId,
      type,
      selected_text: selected_text ?? null,
      note_text: note_text ?? null,
      position_data: position_data ?? null,
      color: color ?? 'yellow',
    })
    .select()
    .single();

  if (error) {
    console.error('[API v1 Annotations] Insert error:', error);
    return errors.internalError();
  }

  return sendSuccess(data as ClipAnnotation, 201);
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');

    if (req.method === 'GET') return handleGet(req, auth, clipId);
    if (req.method === 'POST') return handlePost(req, auth, clipId);
    return errors.methodNotAllowed(['GET', 'POST']);
  },
  { allowedMethods: ['GET', 'POST'] }
);

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
