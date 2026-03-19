/**
 * Cron Job: Send clip reminder notifications
 *
 * Runs every 10 minutes via Vercel Cron (schedule: every 10 min).
 * Finds clips with remind_at <= now(), sends push notification via notifyReminder,
 * then clears remind_at so it does not fire again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyReminder } from '@/lib/services/notification-triggers';

export const maxDuration = 60;

// clips.remind_at not yet reflected in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/NotifyReminders] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Find all clips with due reminders
    const { data: clips, error: queryError } = await db
      .from('clips')
      .select('id, user_id, title, url')
      .not('remind_at', 'is', null)
      .lte('remind_at', now)
      .limit(100);

    if (queryError) {
      console.error('[Cron/NotifyReminders] Query error:', queryError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!clips || clips.length === 0) {
      return NextResponse.json({ message: 'No reminders due', sent: 0 });
    }

    let sent = 0;

    for (const clip of clips as Array<{ id: string; user_id: string; title: string | null; url: string | null }>) {
      const clipTitle = clip.title || clip.url || '클립';

      await notifyReminder(clip.user_id, clip.id, clipTitle);

      // Clear remind_at after sending (regardless of notification pref — reminder is consumed)
      await db.from('clips').update({ remind_at: null }).eq('id', clip.id);

      sent++;
    }

    return NextResponse.json({ message: `Sent ${sent} reminder notifications`, sent });
  } catch (err) {
    console.error('[Cron/NotifyReminders] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
