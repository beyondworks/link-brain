import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

// POST /api/v1/device-tokens — Register device token
export const POST = withAuth(async (req: NextRequest, auth) => {
  const body = await req.json();
  const { token, platform = 'ios' } = body as { token?: string; platform?: string };

  if (!token) {
    return errors.invalidRequest('token is required');
  }

  const { error } = await db
    .from('device_tokens')
    .upsert(
      { user_id: auth.publicUserId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    return errors.internalError('Failed to register device token');
  }

  return sendSuccess({ registered: true });
});

// DELETE /api/v1/device-tokens — Unregister device token
export const DELETE = withAuth(async (req: NextRequest, auth) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return errors.invalidRequest('token query parameter is required');
  }

  await db
    .from('device_tokens')
    .delete()
    .eq('user_id', auth.publicUserId)
    .eq('token', token);

  return sendSuccess({ unregistered: true });
});
