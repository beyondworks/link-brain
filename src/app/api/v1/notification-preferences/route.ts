import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin as never as typeof supabaseAdmin;

interface NotificationPrefsRow {
  id: string;
  user_id: string;
  clip_analyzed: boolean;
  reminder: boolean;
  insights_ready: boolean;
  collaboration: boolean;
  unread_clips: boolean;
  credit_low: boolean;
  credit_granted: boolean;
  updates: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

interface PrefsUpdateBody {
  clip_analyzed?: boolean;
  reminder?: boolean;
  insights_ready?: boolean;
  collaboration?: boolean;
  unread_clips?: boolean;
  credit_low?: boolean;
  credit_granted?: boolean;
  updates?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

const DEFAULT_PREFS = {
  clip_analyzed: true,
  reminder: true,
  insights_ready: true,
  collaboration: true,
  unread_clips: true,
  credit_low: true,
  credit_granted: true,
  updates: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

// GET /api/v1/notification-preferences — get (or upsert default) preferences
export const GET = withAuth(async (_req: NextRequest, auth) => {
  const { data, error } = await db
    .from('notification_preferences' as never)
    .select('*')
    .eq('user_id', auth.publicUserId)
    .single() as unknown as { data: NotificationPrefsRow | null; error: { code?: string } | null };

  // No row yet — upsert defaults
  if (error?.code === 'PGRST116' || !data) {
    const { data: inserted, error: insertError } = await db
      .from('notification_preferences' as never)
      .upsert({ user_id: auth.publicUserId, ...DEFAULT_PREFS } as never, { onConflict: 'user_id' })
      .select('*')
      .single() as unknown as { data: NotificationPrefsRow | null; error: unknown };

    if (insertError || !inserted) {
      return errors.internalError('Failed to initialize notification preferences');
    }

    return sendSuccess(inserted);
  }

  if (error) {
    return errors.internalError('Failed to fetch notification preferences');
  }

  return sendSuccess(data);
});

// PUT /api/v1/notification-preferences — update preferences
export const PUT = withAuth(async (req: NextRequest, auth) => {
  const body = await req.json() as PrefsUpdateBody;

  // Whitelist updatable fields
  const allowed: (keyof PrefsUpdateBody)[] = [
    'clip_analyzed',
    'reminder',
    'insights_ready',
    'collaboration',
    'unread_clips',
    'credit_low',
    'credit_granted',
    'updates',
    'quiet_hours_start',
    'quiet_hours_end',
  ];

  const updates: Partial<PrefsUpdateBody> = {};
  for (const key of allowed) {
    if (key in body) {
      (updates as Record<string, unknown>)[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return errors.invalidRequest('No valid fields provided for update');
  }

  const { data, error } = await db
    .from('notification_preferences' as never)
    .update(updates as never)
    .eq('user_id', auth.publicUserId)
    .select('*')
    .single() as unknown as { data: NotificationPrefsRow | null; error: unknown };

  if (error || !data) {
    return errors.internalError('Failed to update notification preferences');
  }

  return sendSuccess(data);
});
