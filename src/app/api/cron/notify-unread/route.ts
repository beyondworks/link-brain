/**
 * Cron Job: Notify users about unread clips
 *
 * Runs every hour via Vercel Cron (schedule: "0 * * * *").
 * Sends push notification when:
 *   - User has unread clips (is_archived=false, is_hidden=false)
 *   - Last clip was saved 2+ hours ago
 *   - Not already notified today (dedup via notification_log)
 *   - quiet hours check is handled inside notifyUnreadClips
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyUnreadClips } from '@/lib/services/notification-triggers';

export const maxDuration = 60;

// notification_log not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/NotifyUnread] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Find users who have clips (last saved 2+ hours ago)
    const { data: usersWithClips, error: queryError } = await db
      .from('clips')
      .select('user_id')
      .eq('is_archived', false)
      .eq('is_hidden', false)
      .lt('created_at', twoHoursAgo);

    if (queryError) {
      console.error('[Cron/NotifyUnread] Query error:', queryError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!usersWithClips || usersWithClips.length === 0) {
      return NextResponse.json({ message: 'No candidates', sent: 0 });
    }

    // Deduplicate user IDs
    const userIds = [...new Set((usersWithClips as Array<{ user_id: string }>).map((r) => r.user_id))];
    let sent = 0;

    for (const userId of userIds) {
      // Dedup: skip if already notified today
      const { count: alreadySent } = await db
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'unread_clips')
        .gte('sent_at', todayStart.toISOString());

      if ((alreadySent ?? 0) > 0) continue;

      // Count unread clips
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

    return NextResponse.json({ message: `Sent ${sent} unread notifications`, sent });
  } catch (err) {
    console.error('[Cron/NotifyUnread] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
