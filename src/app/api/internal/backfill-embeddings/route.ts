/**
 * Internal API: Backfill embeddings for existing clips
 *
 * POST /api/internal/backfill-embeddings
 * Headers: x-internal-secret
 * Body: { batchSize?: number }
 *
 * Processes clips that don't have embeddings yet, in batches of 50.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { upsertClipEmbedding } from '@/lib/services/embedding-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function getInternalSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  return secret;
}

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  const internalSecret = getInternalSecret();
  const secret = req.headers.get('x-internal-secret');
  if (secret !== internalSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let batchSize = 50;
  try {
    const body = (await req.json()) as { batchSize?: number };
    if (typeof body.batchSize === 'number') {
      batchSize = Math.min(Math.max(body.batchSize, 1), 100);
    }
  } catch {
    // use default
  }

  // Find clips without embeddings that have content
  const { data: clips, error: queryErr } = await db
    .from('clips')
    .select('id, user_id')
    .not('id', 'in', db.from('clip_embeddings').select('clip_id'))
    .eq('processing_status', 'ready')
    .order('created_at', { ascending: false })
    .limit(batchSize);

  if (queryErr) {
    // Fallback: use left join approach via raw query
    const { data: fallbackClips, error: fallbackErr } = await db
      .from('clips')
      .select('id, user_id')
      .eq('processing_status', 'ready')
      .order('created_at', { ascending: false })
      .limit(batchSize * 2);

    if (fallbackErr) {
      console.error('[Backfill] Query failed:', fallbackErr);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    // Filter out clips that already have embeddings
    const clipList = (fallbackClips as Array<{ id: string; user_id: string }>) ?? [];
    if (clipList.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No clips to process' });
    }

    const clipIds = clipList.map((c) => c.id);
    const { data: existingEmbeddings } = await db
      .from('clip_embeddings')
      .select('clip_id')
      .in('clip_id', clipIds);

    const existingSet = new Set(
      ((existingEmbeddings as Array<{ clip_id: string }>) ?? []).map((e) => e.clip_id)
    );
    const toProcess = clipList.filter((c) => !existingSet.has(c.id)).slice(0, batchSize);

    return await processBatch(toProcess);
  }

  const clipList = (clips as Array<{ id: string; user_id: string }>) ?? [];
  if (clipList.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No clips to process' });
  }

  return await processBatch(clipList);
}

async function processBatch(
  clipList: Array<{ id: string; user_id: string }>
): Promise<NextResponse> {
  let succeeded = 0;
  let failed = 0;

  for (const clip of clipList) {
    try {
      const created = await upsertClipEmbedding(clip.id, clip.user_id);
      if (created) succeeded++;
    } catch (err) {
      failed++;
      console.error(`[Backfill] Failed for clip ${clip.id}:`, err);
    }

    // Rate limiting: ~20 requests per second (well within OpenAI limits)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Batch result is returned in the JSON response below

  return NextResponse.json({
    processed: clipList.length,
    succeeded,
    failed,
    message: `Processed ${clipList.length} clips`,
  });
}
