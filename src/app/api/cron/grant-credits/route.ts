/**
 * Cron Job: Grant monthly credits to active users
 *
 * Runs on the 1st of every month at 00:00 UTC (schedule: "0 0 1 * *").
 * Sends push notification to all active users about their credit grant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/services/push-service';

export const maxDuration = 300;

const BATCH_SIZE = 50;

// supabaseAdmin cast to any because notification_preferences table is not yet
// reflected in generated types (run supabase gen types to fix)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/GrantCredits] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find users opted in to credit_granted notifications
    const { data: candidates, error: queryError } = await db
      .from('notification_preferences')
      .select('user_id')
      .eq('credit_granted', true);

    if (queryError) {
      console.error('[Cron/GrantCredits] Query error:', queryError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ message: 'No opted-in users', sent: 0 });
    }

    let sent = 0;

    // Process in batches to avoid overwhelming APNs
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = (candidates as Array<{ user_id: string }>).slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async ({ user_id }) => {
          await sendPushNotification(user_id, {
            title: '이번 달 크레딧이 지급됐어요',
            body: 'AI 기능을 자유롭게 사용해보세요!',
            data: { type: 'credit_granted' },
          });
          sent++;
        })
      );
    }

    return NextResponse.json({ message: `Sent ${sent} credit grant notifications`, sent });
  } catch (err) {
    console.error('[Cron/GrantCredits] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
