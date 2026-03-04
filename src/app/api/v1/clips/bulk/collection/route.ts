/**
 * API v1 - Bulk Collection Operations
 *
 * POST   /api/v1/clips/bulk/collection  - 여러 클립을 컬렉션에 추가 { clipIds, collectionId }
 * DELETE /api/v1/clips/bulk/collection  - 여러 클립을 컬렉션에서 제거 { clipIds, collectionId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const bulkCollectionSchema = z.object({
  clipIds: z.array(z.string().uuid()).min(1).max(100),
  collectionId: z.string().uuid(),
});

/**
 * POST /api/v1/clips/bulk/collection
 * 여러 클립을 컬렉션에 추가합니다. 이미 존재하는 조합은 무시합니다.
 */
async function handleBulkAddToCollection(
  req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Invalid JSON body');
  }

  const parsed = bulkCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return errors.invalidRequest('clipIds (array) and collectionId are required', {
      issues: parsed.error.issues,
    });
  }

  const { clipIds, collectionId } = parsed.data;

  try {
    // 컬렉션 소유권 검증
    const { data: collection, error: collectionError } = await db
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', auth.publicUserId)
      .single();

    if (collectionError || !collection) {
      return errors.notFound('Collection');
    }

    // 클립 소유권 검증
    const { data: ownedClips, error: ownershipError } = await db
      .from('clips')
      .select('id')
      .eq('user_id', auth.publicUserId)
      .in('id', clipIds);

    if (ownershipError) {
      console.error('[API v1 Bulk Collection] Ownership check error:', ownershipError);
      return errors.internalError();
    }

    const ownedIds = ((ownedClips as { id: string }[]) ?? []).map((r) => r.id);
    if (ownedIds.length === 0) {
      return errors.accessDenied();
    }

    const rows = ownedIds.map((clipId) => ({
      clip_id: clipId,
      collection_id: collectionId,
    }));

    const { error: insertError } = await db
      .from('clip_collections')
      .upsert(rows, { onConflict: 'clip_id,collection_id', ignoreDuplicates: true });

    if (insertError) {
      console.error('[API v1 Bulk Collection] Insert error:', insertError);
      return errors.internalError();
    }

    return sendSuccess({ added: ownedIds.length, collectionId });
  } catch (err) {
    console.error('[API v1 Bulk Collection] Add error:', err);
    return errors.internalError();
  }
}

/**
 * DELETE /api/v1/clips/bulk/collection
 * 여러 클립을 컬렉션에서 제거합니다.
 */
async function handleBulkRemoveFromCollection(
  req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Invalid JSON body');
  }

  const parsed = bulkCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return errors.invalidRequest('clipIds (array) and collectionId are required', {
      issues: parsed.error.issues,
    });
  }

  const { clipIds, collectionId } = parsed.data;

  try {
    // 컬렉션 소유권 검증
    const { data: collection, error: collectionError } = await db
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', auth.publicUserId)
      .single();

    if (collectionError || !collection) {
      return errors.notFound('Collection');
    }

    // 클립 소유권 검증
    const { data: ownedClips, error: ownershipError } = await db
      .from('clips')
      .select('id')
      .eq('user_id', auth.publicUserId)
      .in('id', clipIds);

    if (ownershipError) {
      console.error('[API v1 Bulk Collection] Ownership check error:', ownershipError);
      return errors.internalError();
    }

    const ownedIds = ((ownedClips as { id: string }[]) ?? []).map((r) => r.id);
    if (ownedIds.length === 0) {
      return errors.accessDenied();
    }

    const { error: deleteError } = await db
      .from('clip_collections')
      .delete()
      .in('clip_id', ownedIds)
      .eq('collection_id', collectionId);

    if (deleteError) {
      console.error('[API v1 Bulk Collection] Delete error:', deleteError);
      return errors.internalError();
    }

    return sendSuccess({ removed: ownedIds.length, collectionId });
  } catch (err) {
    console.error('[API v1 Bulk Collection] Remove error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'POST') return handleBulkAddToCollection(req, auth);
    if (req.method === 'DELETE') return handleBulkRemoveFromCollection(req, auth);
    return errors.methodNotAllowed(['POST', 'DELETE']);
  },
  { allowedMethods: ['POST', 'DELETE'] }
);

export const POST = routeHandler;
export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
