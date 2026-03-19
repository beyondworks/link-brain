/**
 * API v1 - Bulk Tag Operations
 *
 * POST   /api/v1/clips/bulk/tags  - 여러 클립에 태그 추가 { clipIds, tagIds }
 * DELETE /api/v1/clips/bulk/tags  - 여러 클립에서 태그 제거 { clipIds, tagIds }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { z } from 'zod';

const db = supabaseAdmin;

const bulkTagSchema = z.object({
  clipIds: z.array(z.string().uuid()).min(1).max(100),
  tagIds: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * POST /api/v1/clips/bulk/tags
 * 여러 클립에 태그를 추가합니다. 이미 존재하는 조합은 무시합니다.
 */
async function handleBulkAddTags(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Invalid JSON body');
  }

  const parsed = bulkTagSchema.safeParse(body);
  if (!parsed.success) {
    return errors.invalidRequest('clipIds and tagIds are required arrays', {
      issues: parsed.error.issues,
    });
  }

  const { clipIds, tagIds } = parsed.data;

  try {
    // 클립 소유권 검증
    const { data: ownedClips, error: ownershipError } = await db
      .from('clips')
      .select('id')
      .eq('user_id', auth.publicUserId)
      .in('id', clipIds);

    if (ownershipError) {
      console.error('[API v1 Bulk Tags] Ownership check error:', ownershipError);
      return errors.internalError();
    }

    const ownedIds = ((ownedClips as { id: string }[]) ?? []).map((r) => r.id);
    if (ownedIds.length === 0) {
      return errors.accessDenied();
    }

    // clip_tags 테이블에 bulk insert (upsert로 중복 무시)
    const rows = ownedIds.flatMap((clipId) =>
      tagIds.map((tagId) => ({ clip_id: clipId, tag_id: tagId }))
    );

    const { error: insertError } = await db
      .from('clip_tags')
      .upsert(rows, { onConflict: 'clip_id,tag_id', ignoreDuplicates: true });

    if (insertError) {
      // clip_tags 테이블 미존재 시 graceful 처리
      if (insertError.code === '42P01') {
        console.warn('[API v1 Bulk Tags] clip_tags table does not exist yet');
        return sendSuccess({ updated: 0, message: 'clip_tags table not found' });
      }
      console.error('[API v1 Bulk Tags] Insert error:', insertError);
      return errors.internalError();
    }

    return sendSuccess({ updated: ownedIds.length, tagIds });
  } catch (err) {
    console.error('[API v1 Bulk Tags] Add error:', err);
    return errors.internalError();
  }
}

/**
 * DELETE /api/v1/clips/bulk/tags
 * 여러 클립에서 태그를 제거합니다.
 */
async function handleBulkRemoveTags(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Invalid JSON body');
  }

  const parsed = bulkTagSchema.safeParse(body);
  if (!parsed.success) {
    return errors.invalidRequest('clipIds and tagIds are required arrays', {
      issues: parsed.error.issues,
    });
  }

  const { clipIds, tagIds } = parsed.data;

  try {
    // 클립 소유권 검증
    const { data: ownedClips, error: ownershipError } = await db
      .from('clips')
      .select('id')
      .eq('user_id', auth.publicUserId)
      .in('id', clipIds);

    if (ownershipError) {
      console.error('[API v1 Bulk Tags] Ownership check error:', ownershipError);
      return errors.internalError();
    }

    const ownedIds = ((ownedClips as { id: string }[]) ?? []).map((r) => r.id);
    if (ownedIds.length === 0) {
      return errors.accessDenied();
    }

    const { error: deleteError } = await db
      .from('clip_tags')
      .delete()
      .in('clip_id', ownedIds)
      .in('tag_id', tagIds);

    if (deleteError) {
      // clip_tags 테이블 미존재 시 graceful 처리
      if (deleteError.code === '42P01') {
        console.warn('[API v1 Bulk Tags] clip_tags table does not exist yet');
        return sendSuccess({ removed: 0, message: 'clip_tags table not found' });
      }
      console.error('[API v1 Bulk Tags] Delete error:', deleteError);
      return errors.internalError();
    }

    return sendSuccess({ removed: ownedIds.length, tagIds });
  } catch (err) {
    console.error('[API v1 Bulk Tags] Remove error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'POST') return handleBulkAddTags(req, auth);
    if (req.method === 'DELETE') return handleBulkRemoveTags(req, auth);
    return errors.methodNotAllowed(['POST', 'DELETE']);
  },
  { allowedMethods: ['POST', 'DELETE'] }
);

export const POST = routeHandler;
export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
