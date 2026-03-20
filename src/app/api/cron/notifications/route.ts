/**
 * Combined Cron: Notifications (reminders + unread)
 *
 * Runs every 10 minutes via Vercel Cron.
 * - notify-reminders: every invocation (clips with remind_at <= now)
 * - notify-unread: only on the hour (:00) to avoid spam
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyReminder, notifyUnreadClips } from '@/lib/services/notification-triggers';

export const maxDuration = 60;

// notification_log / remind_at not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/Notifications] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // ── 1. Reminders (every invocation) ──
  try {
    const now = new Date().toISOString();
    const { data: clips, error: reminderError } = await db
      .from('clips')
      .select('id, user_id, title, url')
      .not('remind_at', 'is', null)
      .lte('remind_at', now)
      .limit(100);

    if (reminderError) {
      console.error('[Cron/Notifications] Reminder query error:', reminderError);
      results.reminders = { error: 'Query failed' };
    } else if (!clips || clips.length === 0) {
      results.reminders = { sent: 0 };
    } else {
      let sent = 0;
      for (const clip of clips as Array<{ id: string; user_id: string; title: string | null; url: string | null }>) {
        const clipTitle = clip.title || clip.url || '클립';
        await notifyReminder(clip.user_id, clip.id, clipTitle);
        await db.from('clips').update({ remind_at: null }).eq('id', clip.id);
        sent++;
      }
      results.reminders = { sent };
    }
  } catch (err) {
    console.error('[Cron/Notifications] Reminder error:', err);
    results.reminders = { error: 'Unexpected error' };
  }

  // ── 2. Unread notifications (only on the hour) ──
  const currentMinute = new Date().getUTCMinutes();
  if (currentMinute < 10) {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: usersWithClips, error: queryError } = await db
        .from('clips')
        .select('user_id')
        .eq('is_archived', false)
        .eq('is_hidden', false)
        .lt('created_at', twoHoursAgo);

      if (queryError) {
        console.error('[Cron/Notifications] Unread query error:', queryError);
        results.unread = { error: 'Query failed' };
      } else if (!usersWithClips || usersWithClips.length === 0) {
        results.unread = { sent: 0 };
      } else {
        const userIds = [...new Set((usersWithClips as Array<{ user_id: string }>).map((r) => r.user_id))];
        let sent = 0;

        for (const userId of userIds) {
          const { count: alreadySent } = await db
            .from('notification_log')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'unread_clips')
            .gte('sent_at', todayStart.toISOString());

          if ((alreadySent ?? 0) > 0) continue;

          const { count: unreadCount } = await db
            .from('clips')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_archived', false)
            .eq('is_hidden', false);

          if (!unreadCount || unreadCount === 0) continue;

          await notifyUnreadClips(userId, unreadCount);
          sent++;
        }
        results.unread = { sent };
      }
    } catch (err) {
      console.error('[Cron/Notifications] Unread error:', err);
      results.unread = { error: 'Unexpected error' };
    }
  } else {
    results.unread = { skipped: 'not on the hour' };
  }

  return NextResponse.json({ message: 'Notifications cron complete', ...results });
}
