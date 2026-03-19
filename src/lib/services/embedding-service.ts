/**
 * Embedding Service — OpenAI text-embedding-3-small
 *
 * Generates embeddings for clip content and performs similarity search
 * via Supabase pgvector (match_clips RPC).
 */

import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_INPUT_CHARS = 24000; // ~8000 tokens for text-embedding-3-small

// ─── Core ───────────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');

  const truncated = text.slice(0, MAX_INPUT_CHARS);

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncated,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Embedding API 오류 (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  return json.data[0].embedding;
}

// ─── Clip Embedding Upsert ──────────────────────────────────────────────────

function computeContentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export async function upsertClipEmbedding(
  clipId: string,
  userId: string
): Promise<boolean> {
  // Fetch clip content
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('title, summary, clip_contents(content_markdown)')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) {
    console.warn(`[Embedding] Clip ${clipId} not found:`, clipErr?.message);
    return false;
  }

  const clipRow = clip as {
    title: string | null;
    summary: string | null;
    clip_contents: { content_markdown: string | null } | null;
  };

  const contentParts = [
    clipRow.title ?? '',
    clipRow.summary ?? '',
    clipRow.clip_contents?.content_markdown ?? '',
  ].filter(Boolean);

  const fullText = contentParts.join('\n\n');
  if (!fullText.trim()) {
    console.warn(`[Embedding] Clip ${clipId} has no content to embed`);
    return false;
  }

  const contentHash = computeContentHash(fullText);

  // Check if embedding already exists with same hash
  const { data: existing } = await db
    .from('clip_embeddings')
    .select('content_hash')
    .eq('clip_id', clipId)
    .single();

  if ((existing as { content_hash: string } | null)?.content_hash === contentHash) {
    return false; // No change
  }

  // Generate embedding
  const embedding = await generateEmbedding(fullText);

  // Upsert (PK is clip_id)
  const { error: upsertErr } = await db
    .from('clip_embeddings')
    .upsert(
      {
        clip_id: clipId,
        user_id: userId,
        embedding: JSON.stringify(embedding),
        content_hash: contentHash,
      },
      { onConflict: 'clip_id', ignoreDuplicates: false }
    );

  if (upsertErr) {
    console.error(`[Embedding] Upsert failed for clip ${clipId}:`, upsertErr);
    return false;
  }

  return true;
}

// ─── Similarity Search ──────────────────────────────────────────────────────

export async function searchSimilarClips(
  userId: string,
  query: string,
  limit = 10,
  threshold = 0.3
): Promise<Array<{ clipId: string; similarity: number }>> {
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await db.rpc('match_clips', {
    p_user_id: userId,
    p_embedding: JSON.stringify(queryEmbedding),
    p_match_count: limit,
    p_match_threshold: threshold,
  });

  if (error) {
    console.error('[Embedding] Search failed:', error);
    return [];
  }

  return ((data as Array<{ clip_id: string; similarity: number }>) ?? []).map(
    (row) => ({
      clipId: row.clip_id,
      similarity: row.similarity,
    })
  );
}
