/**
 * API v1 - Collection Share
 *
 * POST   /api/v1/collections/[collectionId]/share  - 공유 토큰 생성
 * DELETE /api/v1/collections/[collectionId]/share  - 공유 해제 (share_token = null)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';

interface CollectionRow {
  id: string;
  user_id: string;
  share_token: string | null;
}

async function getCollectionWithOwnership(
  collectionId: string,
  userId: string
): Promise<{ row: CollectionRow | null; error: string | null }> {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const db = supabaseAdmin;

  const { data, error } = await db
    .from('collections')
    .select('id, user_id, share_token' as 'id, user_id')
    .eq('id', collectionId)
    .single();

  if (error || !data) {
    return { row: null, error: 'not_found' };
  }

  const row = data as unknown as CollectionRow;
  if (row.user_id !== userId) {
    return { row: null, error: 'access_denied' };
  }

  return { row, error: null };
}

/**
 * POST /api/v1/collections/[collectionId]/share
 * 공유 토큰을 생성하고 공유 URL을 반환합니다.
 */
async function handleCreate(
  _req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const { collectionId } = params;
  if (!collectionId) return errors.invalidRequest('Collection ID is required');

  const { row, error: ownershipError } = await getCollectionWithOwnership(
    collectionId,
    auth.publicUserId
  );

  if (ownershipError === 'not_found') {
    return sendError(ErrorCodes.COLLECTION_NOT_FOUND, 'Collection not found.', 404);
  }
  if (ownershipError === 'access_denied' || !row) {
    return errors.accessDenied();
  }

  // 이미 토큰이 있으면 재사용
  const token = row.share_token ?? crypto.randomUUID();

  if (!row.share_token) {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
        const db = supabaseAdmin;

    const { error: updateError } = await db
      .from('collections')
      .update({ share_token: token, updated_at: new Date().toISOString() } as { updated_at: string })
      .eq('id', collectionId);

    if (updateError) {
      // share_token 컬럼이 없는 경우 graceful 처리
      if (
        typeof updateError === 'object' &&
        updateError !== null &&
        'code' in updateError &&
        (updateError as { code: string }).code === '42703'
      ) {
        return sendError(
          'SHARE_NOT_SUPPORTED',
          'Share token column does not exist on collections table.',
          501
        );
      }
      console.error('[API v1 Collection Share] Update error:', updateError);
      return errors.internalError();
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud';
  const shareUrl = `${appUrl}/c/${token}`;

  return sendSuccess({ token, shareUrl }, 201);
}

/**
 * DELETE /api/v1/collections/[collectionId]/share
 * 공유 토큰을 null로 설정하여 공유를 해제합니다.
 */
async function handleDelete(
  _req: NextRequest,
  auth: AuthContext,
  params: Record<string, string>
): Promise<NextResponse> {
  const { collectionId } = params;
  if (!collectionId) return errors.invalidRequest('Collection ID is required');

  const { row, error: ownershipError } = await getCollectionWithOwnership(
    collectionId,
    auth.publicUserId
  );

  if (ownershipError === 'not_found') {
    return sendError(ErrorCodes.COLLECTION_NOT_FOUND, 'Collection not found.', 404);
  }
  if (ownershipError === 'access_denied' || !row) {
    return errors.accessDenied();
  }

  const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const db = supabaseAdmin;

  const { error: updateError } = await db
    .from('collections')
    .update({ share_token: null, updated_at: new Date().toISOString() } as { updated_at: string })
    .eq('id', collectionId);

  if (updateError) {
    if (
      typeof updateError === 'object' &&
      updateError !== null &&
      'code' in updateError &&
      (updateError as { code: string }).code === '42703'
    ) {
      return sendError(
        'SHARE_NOT_SUPPORTED',
        'Share token column does not exist on collections table.',
        501
      );
    }
    console.error('[API v1 Collection Share] Unshare error:', updateError);
    return errors.internalError();
  }

  return sendSuccess({ collectionId, shared: false });
}

const handler = withAuth(
  async (req, auth, params) => {
    const resolvedParams = params ?? {};
    if (req.method === 'POST') return handleCreate(req, auth, resolvedParams);
    if (req.method === 'DELETE') return handleDelete(req, auth, resolvedParams);
    return errors.methodNotAllowed(['POST', 'DELETE']);
  },
  { allowedMethods: ['POST', 'DELETE'] }
);

export const POST = handler;
export const DELETE = handler;
export const OPTIONS = handler;
