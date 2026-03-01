-- =============================================================================
-- 002_pgvector_embeddings.sql
-- Linkbrain v2 - Vector Embeddings for Semantic Search
-- =============================================================================
-- Depends on: 001_initial_schema.sql
-- Requires: pgvector extension (available on Supabase Pro+)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extension
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- TABLE: clip_embeddings
-- Stores the vector embedding for each clip (one row per clip).
-- Using OpenAI text-embedding-3-small produces 1536-dimensional vectors.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_embeddings (
    clip_id         UUID        PRIMARY KEY REFERENCES public.clips(id) ON DELETE CASCADE,
    embedding       vector(1536) NOT NULL,
    embedding_model TEXT        NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clip_embeddings IS 'Vector embeddings for semantic similarity search (1536-dim, OpenAI).';
COMMENT ON COLUMN public.clip_embeddings.embedding       IS '1536-dimensional float vector from OpenAI embedding API.';
COMMENT ON COLUMN public.clip_embeddings.embedding_model IS 'Model name used to generate this embedding (for future re-indexing).';

-- ---------------------------------------------------------------------------
-- INDEX: IVFFlat approximate nearest-neighbour index
-- lists=100 is appropriate for up to ~1M rows; tune upward as data grows.
-- Build after bulk-loading data (ANALYZE clip_embeddings first).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clip_embeddings_ivfflat
    ON public.clip_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMENT ON INDEX public.idx_clip_embeddings_ivfflat IS
    'IVFFlat index for approximate cosine-similarity search. '
    'Rebuild / increase lists= after significant data growth.';

-- ---------------------------------------------------------------------------
-- FUNCTION: find_related_clips
-- Returns the top-N clips most semantically similar to a given clip,
-- excluding the query clip itself and clips owned by other users
-- (when restrict_to_user = TRUE).
--
-- Parameters:
--   p_clip_id         UUID     – reference clip
--   p_match_count     INT      – how many results to return (default 5)
--   p_restrict_to_user BOOLEAN – when TRUE, only return clips owned by the
--                                same user as p_clip_id (default FALSE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_related_clips(
    p_clip_id          UUID,
    p_match_count      INT     DEFAULT 5,
    p_restrict_to_user BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    clip_id    UUID,
    title      TEXT,
    url        TEXT,
    summary    TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_embedding  vector(1536);
    v_owner_id   UUID;
BEGIN
    -- Fetch the query clip's embedding and owner
    SELECT e.embedding, c.user_id
    INTO   v_embedding, v_owner_id
    FROM   public.clip_embeddings e
    JOIN   public.clips           c ON c.id = e.clip_id
    WHERE  e.clip_id = p_clip_id;

    IF v_embedding IS NULL THEN
        RAISE EXCEPTION 'No embedding found for clip_id %', p_clip_id;
    END IF;

    RETURN QUERY
    SELECT
        c.id                                              AS clip_id,
        c.title,
        c.url,
        c.summary,
        (1 - (e.embedding <=> v_embedding))::FLOAT       AS similarity
    FROM   public.clip_embeddings e
    JOIN   public.clips           c ON c.id = e.clip_id
    WHERE  e.clip_id <> p_clip_id
      AND  c.is_archived = FALSE
      AND  (
               p_restrict_to_user = FALSE
               OR c.user_id = v_owner_id
           )
    ORDER BY e.embedding <=> v_embedding   -- cosine distance ASC = similarity DESC
    LIMIT  p_match_count;
END;
$$;

COMMENT ON FUNCTION public.find_related_clips IS
    'RPC: returns the top-N semantically similar clips using cosine similarity on pgvector embeddings.';
