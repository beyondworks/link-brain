/**
 * API v1 - Account
 *
 * DELETE /api/v1/account - Permanently delete the authenticated user's account.
 *
 * Requires JSON body { confirm: "DELETE" } to prevent accidental calls.
 * Session auth only — API keys cannot delete the account.
 *
 * Deletion order:
 * 1. Delete public.users row → ON DELETE CASCADE wipes clips, collections,
 *    categories, subscriptions, credits, api_keys, webhooks, etc.
 *    (public.users.auth_id has NO FK to auth.users, so this must be explicit.)
 * 2. Delete auth.users row via Supabase Auth Admin API.
 * 3. Delete Storage objects (non-fatal) — DB CASCADE doesn't touch Storage.
 *    Prefix differs per bucket: clip-uploads/avatars use the auth id,
 *    clip-pdfs uses the public user id, so both prefixes are swept.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { validateBody } from '@/lib/api/validate';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  confirm: z.literal('DELETE'),
});

/** Buckets holding user files, with the id kind used as the folder prefix. */
const USER_STORAGE_BUCKETS = ['avatars', 'clip-uploads', 'clip-pdfs'] as const;
const STORAGE_LIST_PAGE_SIZE = 100;

/**
 * Remove every object under `{prefix}/` in a bucket.
 * Non-fatal by design — logs and returns instead of throwing.
 */
async function removeStorageFolder(bucket: string, prefix: string): Promise<void> {
  try {
    for (;;) {
      const { data: entries, error: listError } = await supabaseAdmin.storage
        .from(bucket)
        .list(prefix, { limit: STORAGE_LIST_PAGE_SIZE });

      if (listError) {
        console.error(`[API v1 Account] Storage list failed (${bucket}/${prefix}):`, listError);
        return;
      }
      const files = (entries ?? []).filter((e) => e.id !== null);
      if (files.length === 0) return;

      const paths = files.map((e) => `${prefix}/${e.name}`);
      const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (removeError) {
        console.error(`[API v1 Account] Storage remove failed (${bucket}/${prefix}):`, removeError);
        return;
      }
      if (files.length < STORAGE_LIST_PAGE_SIZE) return;
    }
  } catch (err) {
    console.error(`[API v1 Account] Storage cleanup error (${bucket}/${prefix}):`, err);
  }
}

/** Sweep all user-file buckets under both id prefixes (auth id + public id). */
async function cleanupUserStorage(authId: string, publicUserId: string): Promise<void> {
  const prefixes = authId === publicUserId ? [authId] : [authId, publicUserId];
  await Promise.all(
    USER_STORAGE_BUCKETS.flatMap((bucket) =>
      prefixes.map((prefix) => removeStorageFolder(bucket, prefix))
    )
  );
}

async function handleDelete(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  // API 키로는 계정 삭제 불가 — 유출된 키가 계정을 파괴하지 못하도록 세션 인증만 허용
  if (auth.method !== 'session') {
    return errors.accessDenied();
  }

  const bodyResult = await validateBody(req, deleteAccountSchema);
  if (!bodyResult.ok) return bodyResult.response;

  try {
    // 1. public.users 행 삭제 → 모든 사용자 데이터가 CASCADE로 삭제됨
    const { error: publicDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', auth.publicUserId);

    if (publicDeleteError) {
      console.error('[API v1 Account] public.users delete error:', publicDeleteError);
      return errors.internalError();
    }

    // 2. auth.users 행 삭제 (auth_id에는 FK CASCADE가 없어 별도 삭제 필요)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      auth.userId
    );

    if (authDeleteError) {
      // public 데이터는 이미 삭제됨. auth 행이 남으면 로그인은 가능하지만
      // ensurePublicUser가 빈 프로필을 재생성하므로 치명적이지 않음 — 재시도 유도.
      console.error('[API v1 Account] auth.users delete error:', authDeleteError);
      return errors.internalError();
    }

    // 3. Storage 파일 정리 — 실패해도 계정 삭제는 이미 완료된 상태 (non-fatal)
    await cleanupUserStorage(auth.userId, auth.publicUserId);

    return sendSuccess({ deleted: true });
  } catch (err) {
    console.error('[API v1 Account] Delete error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'DELETE') return handleDelete(req, auth);
    return errors.methodNotAllowed(['DELETE']);
  },
  { allowedMethods: ['DELETE'] }
);

export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
