/**
 * API v1 - Collections
 *
 * GET    /api/v1/collections         - List all collections
 * POST   /api/v1/collections         - Create collection
 * PATCH  /api/v1/collections?id=     - Update collection
 * DELETE /api/v1/collections?id=     - Delete collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';
import { validateBody, collectionSchema } from '@/lib/api/validate';
import { checkCollectionLimit } from '@/lib/services/plan-service';
import type { Collection } from '@/types/database';

// Escape strict Supabase generics for tables not fully typed
const db = supabaseAdmin;

/**
 * GET /api/v1/collections
 */
async function handleList(_req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const { data, error } = await db
    .from('collections')
    .select('*')
    .eq('user_id', auth.publicUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API v1 Collections] List error:', error);
    return errors.internalError();
  }

  // Get clip counts via a single batch query (avoids N+1)
  const collectionIds = ((data as Collection[]) ?? []).map((c) => c.id);
  const { data: countRows } = collectionIds.length
    ? await db.from('clip_collections').select('collection_id').in('collection_id', collectionIds)
    : { data: [] as { collection_id: string }[] };

  const countMap = new Map<string, number>();
  for (const row of countRows ?? []) {
    countMap.set(row.collection_id, (countMap.get(row.collection_id) ?? 0) + 1);
  }

  const collections = ((data as Collection[]) ?? []).map((col) => ({
    id: col.id,
    name: col.name,
    description: col.description ?? null,
    color: col.color ?? '#6B7280',
    isPublic: col.is_public ?? false,
    clipCount: countMap.get(col.id) ?? 0,
    createdAt: col.created_at,
    updatedAt: col.updated_at,
  }));

  return sendSuccess(collections);
}

/**
 * POST /api/v1/collections
 */
async function handleCreate(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const bodyResult = await validateBody(req, collectionSchema);
  if (!bodyResult.ok) return bodyResult.response;
  const { name, color, isPublic } = bodyResult.value;

  // Check plan collection limit
  const collectionLimit = await checkCollectionLimit(auth.publicUserId);
  if (!collectionLimit.allowed) {
    return errors.planLimitReached('collection', collectionLimit.used ?? 0, collectionLimit.limit ?? 0);
  }

  const { data, error } = await db
    .from('collections')
    .insert({
      user_id: auth.publicUserId,
      name,
      color: color ?? '#6B7280',
      is_public: isPublic ?? false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[API v1 Collections] Create error:', error);
    return errors.internalError();
  }

  const col = data as Collection;
  return sendSuccess(
    {
      id: col.id,
      name: col.name,
      color: col.color,
      isPublic: col.is_public,
      clipCount: 0,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
    },
    201
  );
}

/**
 * PATCH /api/v1/collections?id=
 */
async function handleUpdate(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const collectionId = req.nextUrl.searchParams.get('id');
  if (!collectionId) return errors.invalidRequest('Collection ID is required');

  const bodyResult = await validateBody(req, collectionSchema.partial());
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.value;

  const { data: existing, error: fetchErr } = await db
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .single();

  if (fetchErr || !existing) {
    return sendError(ErrorCodes.COLLECTION_NOT_FOUND, 'Collection not found.', 404);
  }
  const existingCol = existing as Collection;
  if (existingCol.user_id !== auth.publicUserId) return errors.accessDenied();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.color !== undefined) updates.color = body.color;
  if (body.isPublic !== undefined) updates.is_public = body.isPublic;

  const { data: updated, error: updateErr } = await db
    .from('collections')
    .update(updates)
    .eq('id', collectionId)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error('[API v1 Collections] Update error:', updateErr);
    return errors.internalError();
  }

  const updatedCol = updated as Collection;

  // Get clip count
  const { count } = await db
    .from('clip_collections')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId);

  return sendSuccess({
    id: updatedCol.id,
    name: updatedCol.name,
    color: updatedCol.color,
    isPublic: updatedCol.is_public,
    clipCount: count ?? 0,
    createdAt: updatedCol.created_at,
    updatedAt: updatedCol.updated_at,
  });
}

/**
 * DELETE /api/v1/collections?id=
 */
async function handleDelete(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const collectionId = req.nextUrl.searchParams.get('id');
  if (!collectionId) return errors.invalidRequest('Collection ID is required');

  const { data: existing, error: fetchErr } = await db
    .from('collections')
    .select('id, user_id')
    .eq('id', collectionId)
    .single();

  if (fetchErr || !existing) {
    return sendError(ErrorCodes.COLLECTION_NOT_FOUND, 'Collection not found.', 404);
  }
  if ((existing as Pick<Collection, 'user_id'>).user_id !== auth.publicUserId) return errors.accessDenied();

  // Count clips affected before deletion
  const { count: clipsAffected } = await db
    .from('clip_collections')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId);

  // Delete collection (FK cascade removes clip_collections rows)
  const { error: deleteErr } = await db
    .from('collections')
    .delete()
    .eq('id', collectionId);

  if (deleteErr) {
    console.error('[API v1 Collections] Delete error:', deleteErr);
    return errors.internalError();
  }

  return sendSuccess({ id: collectionId, deleted: true, clipsAffected: clipsAffected ?? 0 });
}

// Route handlers
const handler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleList(req, auth);
    if (req.method === 'POST') return handleCreate(req, auth);
    if (req.method === 'PATCH') return handleUpdate(req, auth);
    if (req.method === 'DELETE') return handleDelete(req, auth);
    return errors.methodNotAllowed(['GET', 'POST', 'PATCH', 'DELETE']);
  },
  { allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE'] }
);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
