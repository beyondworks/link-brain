/**
 * GET  /api/v1/conversations — 대화 목록 (최근 20개)
 * POST /api/v1/conversations — 새 대화 시작
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth } from '@/lib/api/middleware';
import { errors, sendSuccess } from '@/lib/api/response';

const db = supabaseAdmin;

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', auth.publicUserId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Conversations] List error:', error);
        return errors.internalError();
      }

      return sendSuccess({ conversations: data ?? [] });
    }

    if (req.method === 'POST') {
      let title: string | null = null;
      try {
        const body = (await req.json()) as { title?: string };
        if (typeof body.title === 'string') title = body.title.trim().slice(0, 200);
      } catch {
        // no body is fine
      }

      const { data, error } = await db
        .from('conversations')
        .insert({ user_id: auth.publicUserId, title })
        .select('id, title, created_at, updated_at')
        .single();

      if (error) {
        console.error('[Conversations] Create error:', error);
        return errors.internalError();
      }

      return sendSuccess({ conversation: data }, 201);
    }

    return errors.methodNotAllowed(['GET', 'POST']);
  },
  { allowedMethods: ['GET', 'POST'] }
);

export const GET = routeHandler;
export const POST = routeHandler;
export const OPTIONS = routeHandler;
