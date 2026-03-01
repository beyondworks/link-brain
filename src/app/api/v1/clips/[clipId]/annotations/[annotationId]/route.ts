/**
 * API v1 - Clip Annotation Detail
 *
 * PATCH  /api/v1/clips/[clipId]/annotations/[annotationId] - 주석 수정
 * DELETE /api/v1/clips/[clipId]/annotations/[annotationId] - 주석 삭제
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
 * PATCH /api/v1/clips/[clipId]/annotations/[annotationId]
 */
async function handlePatch(
  req: NextRequest,
  auth: AuthContext,
  clipId: string,
  annotationId: string
): Promise<NextResponse> {
  const { data: existing, error: fetchErr } = await db
    .from('clip_annotations')
    .select('id, user_id, clip_id')
    .eq('id', annotationId)
    .eq('clip_id', clipId)
    .single();

  if (fetchErr || !existing) return errors.notFound('annotation');
  if ((existing as { user_id: string }).user_id !== auth.userId) return errors.accessDenied();

  let body: { note_text?: string | null; color?: string };
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Request body must be valid JSON');
  }

  const updates: Record<string, unknown> = {};
  if (body.note_text !== undefined) updates.note_text = body.note_text;
  if (body.color !== undefined) updates.color = body.color;

  if (Object.keys(updates).length === 0) {
    return errors.invalidRequest('At least one field (note_text, color) must be provided');
  }

  const { data, error } = await db
    .from('clip_annotations')
    .update(updates)
    .eq('id', annotationId)
    .select()
    .single();

  if (error) {
    console.error('[API v1 Annotations-Detail] Update error:', error);
    return errors.internalError();
  }

  return sendSuccess(data as ClipAnnotation);
}

/**
 * DELETE /api/v1/clips/[clipId]/annotations/[annotationId]
 */
async function handleDelete(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string,
  annotationId: string
): Promise<NextResponse> {
  const { data: existing, error: fetchErr } = await db
    .from('clip_annotations')
    .select('id, user_id, clip_id')
    .eq('id', annotationId)
    .eq('clip_id', clipId)
    .single();

  if (fetchErr || !existing) return errors.notFound('annotation');
  if ((existing as { user_id: string }).user_id !== auth.userId) return errors.accessDenied();

  const { error } = await db
    .from('clip_annotations')
    .delete()
    .eq('id', annotationId);

  if (error) {
    console.error('[API v1 Annotations-Detail] Delete error:', error);
    return errors.internalError();
  }

  return sendSuccess({ id: annotationId, deleted: true });
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    const annotationId = params?.annotationId ?? '';

    if (!clipId) return errors.invalidRequest('Clip ID is required');
    if (!annotationId) return errors.invalidRequest('Annotation ID is required');

    if (req.method === 'PATCH') return handlePatch(req, auth, clipId, annotationId);
    if (req.method === 'DELETE') return handleDelete(req, auth, clipId, annotationId);
    return errors.methodNotAllowed(['PATCH', 'DELETE']);
  },
  { allowedMethods: ['PATCH', 'DELETE'] }
);

export async function PATCH(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
