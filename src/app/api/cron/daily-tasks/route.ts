/**
 * Combined Cron: Daily tasks
 *
 * Runs daily at 03:00 UTC via Vercel Cron.
 * - aggregate-patterns: every day
 * - retry-failed-clips: every day
 * - grant-credits: only on the 1st of the month
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { aggregateContentPatterns } from '@/lib/services/content-pattern-service';
import { sendPushNotification } from '@/lib/services/push-service';

export const maxDuration = 300;

const MAX_RETRY = 3;
const BATCH_SIZE = 10;
const CREDIT_BATCH_SIZE = 50;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/DailyTasks] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // ── 1. Aggregate content patterns ──
  try {
    const count = await aggregateContentPatterns();
    results.aggregatePatterns = { count };
  } catch (err) {
    console.error('[Cron/DailyTasks] AggregatePatterns error:', err);
    results.aggregatePatterns = { error: 'Failed' };
  }

  // ── 2. Retry failed clips ──
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: failedClips, error: queryError } = await supabaseAdmin
      .from('clips')
      .select('id, url, platform, user_id')
      .lt('retry_count', MAX_RETRY)
      .or(`processing_status.eq.failed,and(processing_status.eq.pending,created_at.lt.${fiveMinutesAgo})`)
      .order('updated_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('[Cron/DailyTasks] RetryClips query error:', queryError);
      results.retryClips = { error: 'Query failed' };
    } else if (!failedClips || failedClips.length === 0) {
      results.retryClips = { retried: 0 };
    } else {
      let retried = 0;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const internalSecret = process.env.INTERNAL_API_SECRET;

      for (const clip of failedClips) {
        try {
          await supabaseAdmin
            .from('clips')
            .update({ processing_status: 'pending', processing_error: null })
            .eq('id', clip.id);

          await fetch(`${baseUrl}/api/internal/process-clip`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
            },
            body: JSON.stringify({
              clipId: clip.id,
              url: clip.url,
              platform: clip.platform,
              userId: clip.user_id,
            }),
          });
          retried++;
        } catch (err) {
          console.error(`[Cron/DailyTasks] RetryClips error for ${clip.id}:`, err);
        }
      }
      results.retryClips = { retried };
    }
  } catch (err) {
    console.error('[Cron/DailyTasks] RetryClips error:', err);
    results.retryClips = { error: 'Failed' };
  }

  // ── 3. Grant credits (1st of month only) ──
  const dayOfMonth = new Date().getUTCDate();
  if (dayOfMonth === 1) {
    try {
      const { data: candidates, error: queryError } = await db
        .from('notification_preferences')
        .select('user_id')
        .eq('credit_granted', true);

      if (queryError) {
        console.error('[Cron/DailyTasks] GrantCredits query error:', queryError);
        results.grantCredits = { error: 'Query failed' };
      } else if (!candidates || candidates.length === 0) {
        results.grantCredits = { sent: 0 };
      } else {
        let sent = 0;
        for (let i = 0; i < candidates.length; i += CREDIT_BATCH_SIZE) {
          const batch = (candidates as Array<{ user_id: string }>).slice(i, i + CREDIT_BATCH_SIZE);
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
        results.grantCredits = { sent };
      }
    } catch (err) {
      console.error('[Cron/DailyTasks] GrantCredits error:', err);
      results.grantCredits = { error: 'Failed' };
    }
  } else {
    results.grantCredits = { skipped: 'not 1st of month' };
  }

  return NextResponse.json({ message: 'Daily tasks complete', ...results });
}
