import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin as never as typeof supabaseAdmin;

interface NotificationLogRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  sent_at: string;
  read_at: string | null;
}

// GET /api/v1/notifications — list recent notifications for the current user
export const GET = withAuth(async (_req: NextRequest, auth) => {
  const { data, error } = await db
    .from('notification_log' as never)
    .select('id, user_id, type, title, body, data, sent_at, read_at')
    .eq('user_id', auth.publicUserId)
    .order('sent_at', { ascending: false })
    .limit(50) as unknown as { data: NotificationLogRow[] | null; error: unknown };

  if (error) {
    return errors.internalError('Failed to fetch notifications');
  }

  return sendSuccess(data ?? []);
});

// PATCH /api/v1/notifications — mark notifications as read
export const PATCH = withAuth(async (req: NextRequest, auth) => {
  const body = await req.json() as { ids?: string[] };
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return errors.invalidRequest('ids must be a non-empty array of notification IDs');
  }

  const { error } = await db
    .from('notification_log' as never)
    .update({ read_at: new Date().toISOString() } as never)
    .in('id', ids)
    .eq('user_id', auth.publicUserId)
    .is('read_at', null) as unknown as { error: unknown };

  if (error) {
    return errors.internalError('Failed to mark notifications as read');
  }

  return sendSuccess({ updated: ids.length });
});
