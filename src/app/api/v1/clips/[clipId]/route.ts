/**
 * API v1 - Clip Detail
 *
 * GET    /api/v1/clips/[clipId] - Get single clip
 * PATCH  /api/v1/clips/[clipId] - Update clip
 * DELETE /api/v1/clips/[clipId] - Delete clip
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { validateBody, updateClipSchema } from '@/lib/api/validate';
import type { ClipData, Category } from '@/types/database';

type RouteContext = { params: Promise<{ clipId: string }> };

// Escape strict Supabase generics for tables not fully typed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * GET /api/v1/clips/[clipId]
 */
async function handleGet(
  req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  const includeContent = req.nextUrl.searchParams.get('content') === 'true';

  const { data, error } = await db
    .from('clips')
    .select(
      includeContent
        ? '*, clip_contents(html_content, content_markdown, raw_markdown)'
        : '*'
    )
    .eq('id', clipId)
    .single();

  if (error || !data) return errors.notFound('clip');

  const clip = data as ClipData & { clip_contents?: Record<string, unknown> };
  if (clip.user_id !== auth.userId) return errors.accessDenied();

  // Fetch collection memberships
  const { data: ccRows } = await db
    .from('clip_collections')
    .select('collection_id')
    .eq('clip_id', clipId);
  const collectionIds = ((ccRows as { collection_id: string }[]) ?? []).map(
    (r) => r.collection_id
  );

  const response: Record<string, unknown> = {
    id: clip.id,
    url: clip.url,
    title: clip.title,
    summary: clip.summary,
    category: clip.category_id,
    platform: clip.platform,
    author: clip.author,
    image: clip.image,
    isFavorite: clip.is_favorite,
    isReadLater: clip.is_read_later,
    isArchived: clip.is_archived,
    collectionIds,
    notes: '',
    keyTakeaways: '',
    createdAt: clip.created_at,
    updatedAt: clip.updated_at,
  };

  if (includeContent && clip.clip_contents) {
    const cc = clip.clip_contents;
    response.rawMarkdown = cc.raw_markdown ?? '';
    response.contentMarkdown = cc.content_markdown ?? '';
    response.htmlContent = cc.html_content ?? '';
  }

  return sendSuccess(response);
}

/**
 * PATCH /api/v1/clips/[clipId]
 */
async function handleUpdate(
  req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  const bodyResult = await validateBody(req, updateClipSchema);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.value;

  const { data: existing, error: fetchErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (fetchErr || !existing) return errors.notFound('clip');
  if ((existing as Pick<ClipData, 'user_id'>).user_id !== auth.userId) return errors.accessDenied();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.summary !== undefined) updates.summary = body.summary;
  if (body.isFavorite !== undefined) updates.is_favorite = body.isFavorite;
  if (body.isReadLater !== undefined) updates.is_read_later = body.isReadLater;
  if (body.isArchived !== undefined) updates.is_archived = body.isArchived;

  // Category: name -> id resolution
  if (body.category !== undefined) {
    const { data: catRow } = await db
      .from('categories')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('name', body.category)
      .single();
    updates.category_id = catRow ? (catRow as Pick<Category, 'id'>).id : null;
  }

  const { data: updated, error: updateErr } = await db
    .from('clips')
    .update(updates)
    .eq('id', clipId)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error('[API v1 Clips-Detail] Update error:', updateErr);
    return errors.internalError();
  }

  const updatedClip = updated as ClipData;

  // Update collection memberships if provided
  if (body.collectionIds !== undefined) {
    await db.from('clip_collections').delete().eq('clip_id', clipId);
    if (body.collectionIds.length > 0) {
      await db.from('clip_collections').insert(
        body.collectionIds.map((cid: string) => ({
          clip_id: clipId,
          collection_id: cid,
        }))
      );
    }
  }

  // Get final collection ids
  const { data: ccRows } = await db
    .from('clip_collections')
    .select('collection_id')
    .eq('clip_id', clipId);
  const collectionIds = ((ccRows as { collection_id: string }[]) ?? []).map(
    (r) => r.collection_id
  );

  return sendSuccess({
    id: updatedClip.id,
    url: updatedClip.url,
    title: updatedClip.title,
    summary: updatedClip.summary,
    category: updatedClip.category_id,
    platform: updatedClip.platform,
    author: updatedClip.author,
    image: updatedClip.image,
    isFavorite: updatedClip.is_favorite,
    isReadLater: updatedClip.is_read_later,
    isArchived: updatedClip.is_archived,
    collectionIds,
    createdAt: updatedClip.created_at,
    updatedAt: updatedClip.updated_at,
  });
}

/**
 * DELETE /api/v1/clips/[clipId]
 */
async function handleDelete(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  const { data: existing, error: fetchErr } = await db
    .from('clips')
    .select('id, user_id')
    .eq('id', clipId)
    .single();

  if (fetchErr || !existing) return errors.notFound('clip');
  if ((existing as Pick<ClipData, 'user_id'>).user_id !== auth.userId) return errors.accessDenied();

  const { error: deleteErr } = await db
    .from('clips')
    .delete()
    .eq('id', clipId);

  if (deleteErr) {
    console.error('[API v1 Clips-Detail] Delete error:', deleteErr);
    return errors.internalError();
  }

  return sendSuccess({ id: clipId, deleted: true });
}

// Route-level handlers
const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');

    if (req.method === 'GET') return handleGet(req, auth, clipId);
    if (req.method === 'PATCH') return handleUpdate(req, auth, clipId);
    if (req.method === 'DELETE') return handleDelete(req, auth, clipId);
    return errors.methodNotAllowed(['GET', 'PATCH', 'DELETE']);
  },
  { allowedMethods: ['GET', 'PATCH', 'DELETE'] }
);

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
