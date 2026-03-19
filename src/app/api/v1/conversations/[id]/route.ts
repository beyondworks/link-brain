/**
 * GET    /api/v1/conversations/[id] — 대화 메시지 목록
 * DELETE /api/v1/conversations/[id] — 대화 삭제
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth } from '@/lib/api/middleware';
import { errors, sendSuccess } from '@/lib/api/response';

const db = supabaseAdmin;

const routeHandler = withAuth(
  async (req, auth, params) => {
    const id = params?.id;
    if (!id) return errors.notFound('conversation');

    // Verify ownership
    const { data: conv, error: convErr } = await db
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.publicUserId)
      .single();

    if (convErr || !conv) {
      return errors.notFound('conversation');
    }

    if (req.method === 'GET') {
      const { data: messages, error: msgErr } = await db
        .from('messages')
        .select('id, role, content, clip_references, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (msgErr) {
        console.error('[Conversations] Messages error:', msgErr);
        return errors.internalError();
      }

      return sendSuccess({ conversationId: id, messages: messages ?? [] });
    }

    if (req.method === 'DELETE') {
      const { error: delErr } = await db
        .from('conversations')
        .delete()
        .eq('id', id);

      if (delErr) {
        console.error('[Conversations] Delete error:', delErr);
        return errors.internalError();
      }

      return sendSuccess({ deleted: true });
    }

    return errors.methodNotAllowed(['GET', 'DELETE']);
  },
  { allowedMethods: ['GET', 'DELETE'] }
);

export const GET = routeHandler;
export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
