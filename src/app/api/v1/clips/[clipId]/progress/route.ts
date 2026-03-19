/**
 * API v1 - Reading Progress
 *
 * GET   /api/v1/clips/[clipId]/progress  - 현재 읽기 진행률 반환
 * PATCH /api/v1/clips/[clipId]/progress  - 읽기 진행률 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, errors, ErrorCodes } from '@/lib/api/response';
import type { ClipData, ReadingProgress } from '@/types/database';

type RouteContext = { params: Promise<{ clipId: string }> };

const db = supabaseAdmin;

async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  // 클립 소유 확인
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) return errors.notFound('clip');
  if ((clip as Pick<ClipData, 'user_id'>).user_id !== auth.publicUserId) return errors.accessDenied();

  const { data, error } = await db
    .from('reading_progress')
    .select('*')
    .eq('clip_id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[API v1 Progress GET] Error:', error);
    return errors.internalError();
  }

  if (!data) {
    return sendSuccess({ clip_id: clipId, scroll_percentage: 0, time_spent_seconds: 0, completed_at: null, last_read_at: null });
  }

  const progress = data as ReadingProgress;
  return sendSuccess({
    clip_id: progress.clip_id,
    scroll_percentage: progress.scroll_percentage,
    time_spent_seconds: progress.time_spent_seconds,
    completed_at: progress.completed_at,
    last_read_at: progress.last_read_at,
  });
}

async function handlePatch(
  req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Invalid JSON body');
  }

  if (typeof body !== 'object' || body === null) {
    return errors.invalidRequest('Body must be an object');
  }

  const { scroll_percentage, time_spent_seconds } = body as Record<string, unknown>;

  if (scroll_percentage !== undefined && (typeof scroll_percentage !== 'number' || scroll_percentage < 0 || scroll_percentage > 100)) {
    return sendError(ErrorCodes.INVALID_REQUEST, 'scroll_percentage must be a number between 0 and 100', 400);
  }
  if (time_spent_seconds !== undefined && (typeof time_spent_seconds !== 'number' || time_spent_seconds < 0)) {
    return sendError(ErrorCodes.INVALID_REQUEST, 'time_spent_seconds must be a non-negative number', 400);
  }

  // 클립 소유 확인
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) return errors.notFound('clip');
  if ((clip as Pick<ClipData, 'user_id'>).user_id !== auth.publicUserId) return errors.accessDenied();

  const now = new Date().toISOString();
  const pct = typeof scroll_percentage === 'number' ? scroll_percentage : undefined;
  const completedAt = pct === 100 ? now : null;

  const upsertData: Partial<ReadingProgress> & { clip_id: string; user_id: string } = {
    clip_id: clipId,
    user_id: auth.publicUserId,
    last_read_at: now,
    ...(pct !== undefined && { scroll_percentage: pct }),
    ...(typeof time_spent_seconds === 'number' && { time_spent_seconds }),
    ...(pct === 100 && { completed_at: completedAt }),
  };

  const { data, error } = await db
    .from('reading_progress')
    .upsert(upsertData, { onConflict: 'clip_id,user_id' })
    .select()
    .single();

  if (error) {
    console.error('[API v1 Progress PATCH] Error:', error);
    return errors.internalError();
  }

  const progress = data as ReadingProgress;
  return sendSuccess({
    clip_id: progress.clip_id,
    scroll_percentage: progress.scroll_percentage,
    time_spent_seconds: progress.time_spent_seconds,
    completed_at: progress.completed_at,
    last_read_at: progress.last_read_at,
  });
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');

    if (req.method === 'GET') return handleGet(req, auth, clipId);
    if (req.method === 'PATCH') return handlePatch(req, auth, clipId);
    return errors.methodNotAllowed(['GET', 'PATCH']);
  },
  { allowedMethods: ['GET', 'PATCH'] }
);

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
