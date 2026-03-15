/**
 * Internal API: Background clip processing
 *
 * POST /api/internal/process-clip
 * Body: { clipId, url, platform, userId }
 *
 * Called fire-and-forget from the public clips API after instant save.
 * Runs content extraction + AI enrichment in the background.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchUrlContent } from '@/lib/fetchers/orchestrator';
import { enrichClipContent } from '@/lib/services/clip-service';
import { getValidToken } from '@/lib/oauth/token-manager';
import { upsertClipEmbedding } from '@/lib/services/embedding-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

interface ProcessClipBody {
  clipId: string;
  url: string;
  platform: string;
  userId: string;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Internal authentication — always required
  if (!INTERNAL_SECRET) {
    console.error('[ProcessClip] INTERNAL_API_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const secret = req.headers.get('x-internal-secret');
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ProcessClipBody;
  try {
    body = await req.json() as ProcessClipBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clipId, url, platform, userId } = body;

  if (!clipId || !url || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Mark as processing
    await db
      .from('clips')
      .update({ processing_status: 'processing' })
      .eq('id', clipId);

    // Look up OAuth token for authenticated API access
    let oauthToken: string | undefined;
    if (platform === 'threads') {
      try {
        oauthToken = await getValidToken(userId, 'threads');
      } catch {
        // No token — continue without OAuth
      }
    }

    // Fetch content via orchestrator
    const fetchedContent = await fetchUrlContent(
      url,
      oauthToken ? { oauthToken } : undefined
    );

    // Source type mapping
    const sourceTypeMap: Record<string, 'instagram' | 'threads' | 'youtube' | 'web' | 'twitter'> = {
      instagram: 'instagram',
      threads: 'threads',
      youtube: 'youtube',
      twitter: 'twitter',
      web: 'web',
    };
    const sourceType = sourceTypeMap[platform] ?? 'web';

    // Enrich clip with AI metadata + content
    await enrichClipContent({
      clipId,
      url,
      sourceType,
      platform,
      rawText: fetchedContent.rawText,
      htmlContent: fetchedContent.htmlContent,
      images: fetchedContent.images,
      userId,
      author: fetchedContent.author,
      authorAvatar: fetchedContent.authorAvatar,
      authorHandle: fetchedContent.authorHandle,
      embeddedLinks: fetchedContent.embeddedLinks,
    });

    // Generate embedding (fire-and-forget, non-blocking)
    try {
      await upsertClipEmbedding(clipId, userId);
    } catch (embErr) {
      console.warn(`[ProcessClip] Embedding failed for clip ${clipId}:`, embErr);
      // Non-fatal: clip processing succeeded even if embedding fails
    }

    return NextResponse.json({ success: true, clipId });
  } catch (err) {
    console.error(`[ProcessClip] Failed for clip ${clipId}:`, err);

    // Mark as failed with error message + increment retry_count
    const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';

    // Read current retry_count then increment
    const { data: current } = await db
      .from('clips')
      .select('retry_count')
      .eq('id', clipId)
      .single();

    const currentRetry = (current as { retry_count: number } | null)?.retry_count ?? 0;

    await db
      .from('clips')
      .update({
        processing_status: 'failed',
        processing_error: errorMessage.substring(0, 500),
        retry_count: currentRetry + 1,
      })
      .eq('id', clipId);

    return NextResponse.json(
      { error: 'Processing failed', clipId, message: errorMessage },
      { status: 500 }
    );
  }
}
