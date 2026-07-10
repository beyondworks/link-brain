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
import { fetchUrlContentDetailed } from '@/lib/fetchers/orchestrator';
import type { FetchResult, FetchAttempt } from '@/lib/fetchers/fetch-result';
import { enrichClipContent } from '@/lib/services/clip-service';
import { getValidToken } from '@/lib/oauth/token-manager';
import { upsertClipEmbedding } from '@/lib/services/embedding-service';
import { deductCredits } from '@/lib/services/plan-service';
import { resolveAIConfig } from '@/lib/ai/model-resolver';
import type { ResolvedAIConfig } from '@/lib/ai/model-resolver';
import { notifyClipAnalyzed } from '@/lib/services/notification-triggers';

const db = supabaseAdmin;

/** Max retry_count — pinning to this stops the daily-tasks cron re-queueing. */
const MAX_RETRY = 3;

/** Best human-readable detail for a blocked outcome, newest challenge first. */
function blockedDetail(attempts: FetchAttempt[]): string {
  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if ((a.verdict === 'challenge' || a.verdict === 'auth_gate' || a.verdict === 'rate_limited') && a.detail) {
      return a.detail;
    }
  }
  const last = attempts[attempts.length - 1];
  return last?.detail ?? last?.verdict ?? 'blocked';
}

/** Resolve the fetch_method string to persist for a content-bearing result. */
function resolveFetchMethod(result: FetchResult): string | null {
  if (result.kind === 'success' || result.kind === 'weak') return result.method;
  if (result.kind === 'blocked') {
    return result.attempts[result.attempts.length - 1]?.method ?? 'og-meta';
  }
  return null;
}

function getInternalSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  return secret;
}

interface ProcessClipBody {
  clipId: string;
  url: string;
  platform: string;
  userId: string;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Internal authentication — always required
  const internalSecret = getInternalSecret();
  const secret = req.headers.get('x-internal-secret');
  if (secret !== internalSecret) {
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

    // Fetch content via orchestrator (rich, tiered result)
    const result = await fetchUrlContentDetailed(
      url,
      oauthToken ? { oauthToken } : undefined
    );

    // ── Decision matrix: gate credits on the fetch outcome ──
    // Only success / weak / blocked-with-content proceed to enrichment (and
    // therefore spend an AI credit). Every failure path skips credit deduction.

    if (result.kind === 'error') {
      // Retryable network/timeout → throw so the catch marks failed + cron retries.
      if (result.retryable) {
        throw new Error(`${result.code}: ${result.message}`);
      }
      // FETCH_NOT_FOUND → mark failed and pin retry_count so cron never re-queues.
      if (result.code === 'FETCH_NOT_FOUND') {
        await db.rpc('mark_clip_failed', {
          p_clip_id: clipId,
          p_error: `FETCH_NOT_FOUND: ${result.message}`,
        });
        await db.from('clips').update({ retry_count: MAX_RETRY }).eq('id', clipId);
        return NextResponse.json({ error: 'Resource not found', clipId }, { status: 404 });
      }
      // Other non-retryable errors (e.g. SSRF) → mark failed, no retry benefit.
      await db.rpc('mark_clip_failed', {
        p_clip_id: clipId,
        p_error: `${result.code}: ${result.message}`,
      });
      return NextResponse.json({ error: result.code, clipId }, { status: 422 });
    }

    if (result.kind === 'empty') {
      await db.rpc('mark_clip_failed', {
        p_clip_id: clipId,
        p_error: 'FETCH_EMPTY: no extractable content',
      });
      return NextResponse.json({ error: 'No extractable content', clipId }, { status: 422 });
    }

    if (result.kind === 'blocked' && result.content === null) {
      await db.rpc('mark_clip_failed', {
        p_clip_id: clipId,
        p_error: `FETCH_BLOCKED: ${blockedDetail(result.attempts)}`,
      });
      return NextResponse.json({ error: 'Content blocked', clipId }, { status: 422 });
    }

    // ── Content-bearing: success | weak | blocked-with-content ──
    const content = result.content!;

    // Source type mapping
    const sourceTypeMap: Record<string, 'instagram' | 'threads' | 'youtube' | 'web' | 'twitter'> = {
      instagram: 'instagram',
      threads: 'threads',
      youtube: 'youtube',
      twitter: 'twitter',
      web: 'web',
    };
    const sourceType = sourceTypeMap[platform] ?? 'web';

    // Deduct AI_SUMMARY credit before AI enrichment.
    // Skip credit deduction if user has their own API key configured.
    const aiConfig: ResolvedAIConfig = await resolveAIConfig(userId, 'default');
    if (!aiConfig.isUserKey) {
      const creditCheck = await deductCredits(userId, 'AI_SUMMARY', clipId);
      if (!creditCheck.allowed) {
        console.warn(`[ProcessClip] Insufficient credits for user ${userId}, skipping AI enrichment`);
        await db
          .from('clips')
          .update({ processing_status: 'failed', processing_error: 'Insufficient AI credits' })
          .eq('id', clipId);
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // Enrich clip with AI metadata + content (enrich sets processing_status='ready').
    await enrichClipContent(
      {
        clipId,
        url,
        sourceType,
        platform,
        rawText: content.rawText,
        htmlContent: content.htmlContent,
        images: content.images,
        userId,
        author: content.author,
        authorAvatar: content.authorAvatar,
        authorHandle: content.authorHandle,
        embeddedLinks: content.embeddedLinks,
      },
      { aiConfig }
    );

    // Persist fetch_method, and downgrade status for weak / blocked-with-content.
    const statusPatch: {
      fetch_method: string | null;
      processing_status?: string;
      processing_error?: string;
    } = { fetch_method: resolveFetchMethod(result) };
    if (result.kind === 'weak') {
      statusPatch.processing_status = 'partial';
    } else if (result.kind === 'blocked') {
      statusPatch.processing_status = 'partial';
      statusPatch.processing_error = `FETCH_BLOCKED: ${blockedDetail(result.attempts)}`;
    }
    await db.from('clips').update(statusPatch).eq('id', clipId);

    // Generate embedding (fire-and-forget, non-blocking)
    try {
      await upsertClipEmbedding(clipId, userId);
    } catch (embErr) {
      console.warn(`[ProcessClip] Embedding failed for clip ${clipId}:`, embErr);
      // Non-fatal: clip processing succeeded even if embedding fails
    }

    // Notify user that clip analysis is complete (fire-and-forget)
    try {
      const { data: clipRow } = await db
        .from('clips')
        .select('title')
        .eq('id', clipId)
        .single();
      const clipTitle = (clipRow as { title: string | null } | null)?.title ?? url;
      notifyClipAnalyzed(userId, clipId, clipTitle).catch(() => undefined);
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, clipId, kind: result.kind });
  } catch (err) {
    console.error(`[ProcessClip] Failed for clip ${clipId}:`, err);

    // Mark as failed + increment retry_count atomically (RPC, no read-then-write race)
    const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';

    const { error: rpcError } = await db.rpc('mark_clip_failed', {
      p_clip_id: clipId,
      p_error: errorMessage,
    });
    if (rpcError) {
      console.error(`[ProcessClip] mark_clip_failed RPC error for clip ${clipId}:`, rpcError);
    }

    return NextResponse.json(
      { error: 'Processing failed', clipId, message: errorMessage },
      { status: 500 }
    );
  }
}
