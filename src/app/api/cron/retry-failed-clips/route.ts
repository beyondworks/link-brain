/**
 * Cron Job: Retry failed clip processing
 *
 * Runs every 15 minutes via Vercel Cron.
 * Picks up clips with processing_status = 'failed' and retry_count < 3.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const MAX_RETRY = 3;
const BATCH_SIZE = 10;

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret — always required
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/RetryClips] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find failed clips + stuck pending clips (older than 5 minutes) eligible for retry
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: failedClips, error: queryError } = await db
      .from('clips')
      .select('id, url, platform, user_id')
      .lt('retry_count', MAX_RETRY)
      .or(`processing_status.eq.failed,and(processing_status.eq.pending,created_at.lt.${fiveMinutesAgo})`)
      .order('updated_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('[Cron/RetryClips] Query error:', queryError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!failedClips || failedClips.length === 0) {
      return NextResponse.json({ message: 'No clips to retry', retried: 0 });
    }

    const results: Array<{ clipId: string; status: string }> = [];

    for (const clip of failedClips as Array<{ id: string; url: string; platform: string; user_id: string }>) {
      try {
        // Reset status to pending (retry_count is incremented by process-clip on failure)
        await db
          .from('clips')
          .update({
            processing_status: 'pending',
            processing_error: null,
          })
          .eq('id', clip.id);

        // Fire-and-forget: trigger background processing
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const internalSecret = process.env.INTERNAL_API_SECRET;

        fetch(`${baseUrl}/api/internal/process-clip`, {
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
        }).catch((err) => {
          console.error(`[Cron/RetryClips] Failed to trigger processing for ${clip.id}:`, err);
        });

        results.push({ clipId: clip.id, status: 'triggered' });
      } catch (err) {
        console.error(`[Cron/RetryClips] Error processing clip ${clip.id}:`, err);
        results.push({ clipId: clip.id, status: 'error' });
      }
    }

    return NextResponse.json({
      message: `Retried ${results.length} clips`,
      retried: results.length,
      results,
    });
  } catch (err) {
    console.error('[Cron/RetryClips] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
