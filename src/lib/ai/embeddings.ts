// Embedding operations for Linkbrain v2
// Uses OpenAI text-embedding-3-small (1536 dimensions) stored in clip_embeddings.
// clip_embeddings is not in the generated Database type, so we cast via unknown.

import { generateEmbedding as openaiGenerateEmbedding } from './openai';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Raw Supabase client without Database generic constraints, used for
// tables not yet present in the Database type definition (clip_embeddings).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * Generate a 1536-dimensional embedding vector for the given text.
 * Uses OpenAI text-embedding-3-small.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  return openaiGenerateEmbedding(text);
};

/**
 * Store an embedding in the clip_embeddings table.
 * Upserts so repeated calls are safe (e.g., re-indexing).
 */
export const storeEmbedding = async (
  clipId: string,
  embedding: number[]
): Promise<void> => {
  const { error } = await db
    .from('clip_embeddings')
    .upsert(
      {
        clip_id: clipId,
        embedding: `[${embedding.join(',')}]`,
        embedding_model: 'text-embedding-3-small',
      },
      { onConflict: 'clip_id' }
    );

  if (error) {
    console.error('[Embeddings] storeEmbedding error:', error);
    throw error;
  }
};

export interface RelatedClip {
  clip_id: string;
  title: string | null;
  url: string;
  summary: string | null;
  similarity: number;
}

/**
 * Find clips semantically related to the given clip.
 * Calls the Supabase RPC function `find_related_clips`.
 *
 * @param clipId          - UUID of the reference clip
 * @param limit           - Number of results (default 5)
 * @param restrictToUser  - When true, only return clips owned by the same user
 */
export const findRelatedClips = async (
  clipId: string,
  limit = 5,
  restrictToUser = true
): Promise<RelatedClip[]> => {
  const { data, error } = await db.rpc('find_related_clips', {
    p_clip_id: clipId,
    p_match_count: limit,
    p_restrict_to_user: restrictToUser,
  });

  if (error) {
    console.error('[Embeddings] findRelatedClips error:', error);
    // Return empty rather than throwing — related clips are non-critical
    return [];
  }

  return (data as RelatedClip[]) ?? [];
};

/**
 * Generate and store an embedding for a clip in one call.
 * Builds the embedding text from title + summary + rawText.
 */
export const indexClipEmbedding = async (params: {
  clipId: string;
  title: string | null;
  summary: string | null;
  rawText?: string | null;
}): Promise<void> => {
  const { clipId, title, summary, rawText } = params;

  const embeddingText = [title, summary, rawText?.substring(0, 2000)]
    .filter(Boolean)
    .join('\n\n');

  if (!embeddingText.trim()) {
    console.warn(`[Embeddings] No text to embed for clip ${clipId}, skipping.`);
    return;
  }

  const embedding = await generateEmbedding(embeddingText);
  await storeEmbedding(clipId, embedding);

  console.log(`[Embeddings] Indexed clip ${clipId} (${embedding.length}d vector)`);
};
