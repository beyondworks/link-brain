/**
 * Cron Job: Aggregate content patterns (collective learning)
 *
 * Runs daily at 3 AM UTC via Vercel Cron.
 * Analyzes clip structure patterns and upserts to content_patterns table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateContentPatterns } from '@/lib/services/content-pattern-service';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron/AggregatePatterns] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await aggregateContentPatterns();
    return NextResponse.json({
      message: `Aggregated ${count} content pattern groups`,
      count,
    });
  } catch (err) {
    console.error('[Cron/AggregatePatterns] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
