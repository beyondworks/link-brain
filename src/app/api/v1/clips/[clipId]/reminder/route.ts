/**
 * API v1 - Clip Reminder
 *
 * GET    /api/v1/clips/:id/reminder  — 현재 리마인더 조회
 * POST   /api/v1/clips/:id/reminder  — 리마인더 설정 { remind_at: ISO date string }
 * DELETE /api/v1/clips/:id/reminder  — 리마인더 취소 (remind_at = null)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import type { ClipData } from '@/types/database';

const db = supabaseAdmin;

/**
 * GET /api/v1/clips/:id/reminder
 * 현재 리마인더 설정 조회
 */
async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const clipId = params.clipId;

  const { data, error } = await db
    .from('clips')
    .select('id, remind_at')
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (error || !data) return errors.notFound('Clip');

  const clip = data as Pick<ClipData, 'id' | 'remind_at'>;
  return sendSuccess({ remindAt: clip.remind_at ?? null });
}

/**
 * POST /api/v1/clips/:id/reminder
 * 리마인더 설정 — remind_at 컬럼 업데이트
 */
async function handleSet(
  req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const clipId = params.clipId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('요청 본문이 유효한 JSON이 아닙니다.');
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('remind_at' in body) ||
    typeof (body as Record<string, unknown>).remind_at !== 'string'
  ) {
    return errors.invalidRequest('remind_at (ISO date string) 필드가 필요합니다.');
  }

  const remindAt = (body as Record<string, string>).remind_at;

  // ISO date 유효성 확인
  const parsed = new Date(remindAt);
  if (isNaN(parsed.getTime())) {
    return errors.invalidRequest('remind_at이 유효한 날짜 형식이 아닙니다.');
  }

  // 소유권 확인
  const { data: existing, error: fetchError } = await db
    .from('clips')
    .select('id')
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (fetchError || !existing) return errors.notFound('Clip');

  const { error: updateError } = await db
    .from('clips')
    .update({ remind_at: remindAt })
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId);

  if (updateError) {
    // remind_at 컬럼이 없는 경우 graceful 처리
    if (
      updateError.code === '42703' ||
      (typeof updateError.message === 'string' &&
        updateError.message.includes('remind_at'))
    ) {
      console.warn('[API v1 Reminder] remind_at column not found — migration required');
      return errors.invalidRequest(
        'remind_at 컬럼이 DB에 없습니다. 마이그레이션이 필요합니다.',
        { hint: 'ALTER TABLE clips ADD COLUMN remind_at timestamptz;' }
      );
    }
    console.error('[API v1 Reminder] Set error:', updateError);
    return errors.internalError();
  }

  return sendSuccess({ remindAt });
}

/**
 * DELETE /api/v1/clips/:id/reminder
 * 리마인더 취소 — remind_at = null
 */
async function handleCancel(
  _req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const clipId = params.clipId;

  // 소유권 확인
  const { data: existing, error: fetchError } = await db
    .from('clips')
    .select('id')
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (fetchError || !existing) return errors.notFound('Clip');

  const { error: updateError } = await db
    .from('clips')
    .update({ remind_at: null })
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId);

  if (updateError) {
    console.error('[API v1 Reminder] Cancel error:', updateError);
    return errors.internalError();
  }

  return sendSuccess({ remindAt: null });
}

const routeHandler = withAuth(
  async (req, auth, params = {}) => {
    if (req.method === 'GET') return handleGet(req, auth, params);
    if (req.method === 'POST') return handleSet(req, auth, params);
    if (req.method === 'DELETE') return handleCancel(req, auth, params);
    return errors.methodNotAllowed(['GET', 'POST', 'DELETE']);
  },
  { allowedMethods: ['GET', 'POST', 'DELETE'] }
);

export const GET = routeHandler;
export const POST = routeHandler;
export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
