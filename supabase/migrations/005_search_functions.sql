-- =============================================================================
-- 005_search_functions.sql
-- Linkbrain v2 - Smart Search & Omni-Search Functions
-- =============================================================================
-- Depends on: 001_initial_schema.sql, 002_pgvector_embeddings.sql
-- Requires: pg_trgm, vector (both enabled here for idempotency)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;   -- already created in 002; idempotent

-- ---------------------------------------------------------------------------
-- Trigram indexes for fuzzy / partial-match search on clips
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clips_title_trgm
    ON public.clips USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clips_summary_trgm
    ON public.clips USING GIN (summary gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- TABLE: tag_usage_stats
-- Materialised-style table updated by application or a scheduled job.
-- Keeps tag cloud / autocomplete fast without a live COUNT query.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tag_usage_stats (
    tag_id      UUID    PRIMARY KEY REFERENCES public.tags(id) ON DELETE CASCADE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tag_usage_stats IS
    'Denormalised clip count per tag; refresh via application logic or pg_cron.';

-- ---------------------------------------------------------------------------
-- FUNCTION: smart_search
-- Hybrid search combining:
--   1. Full-Text Search (FTS via the generated tsvector on clips.fts)
--   2. Trigram similarity (pg_trgm) for partial / typo-tolerant matching
--   3. Semantic cosine similarity (pgvector) when a query embedding is supplied
--
-- Parameters:
--   p_user_id       UUID     – scope results to this user's clips
--   p_query         TEXT     – raw search string
--   p_embedding     vector   – optional pre-computed query embedding (pass NULL to skip)
--   p_match_count   INT      – max rows to return (default 20)
--   p_include_public BOOLEAN – also search public clips from other users (default FALSE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.smart_search(
    p_user_id        UUID,
    p_query          TEXT,
    p_embedding      vector(1536) DEFAULT NULL,
    p_match_count    INT          DEFAULT 20,
    p_include_public BOOLEAN      DEFAULT FALSE
)
RETURNS TABLE (
    clip_id       UUID,
    title         TEXT,
    url           TEXT,
    summary       TEXT,
    platform      TEXT,
    fts_rank      FLOAT,
    trgm_score    FLOAT,
    semantic_score FLOAT,
    combined_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT
            c.id,
            c.title,
            c.url,
            c.summary,
            c.platform,
            -- FTS rank (0 when query is blank)
            CASE
                WHEN p_query <> '' THEN
                    ts_rank(c.fts, plainto_tsquery('simple', p_query))::FLOAT
                ELSE 0
            END AS fts_rank,
            -- Trigram similarity on title (0 when query is blank)
            CASE
                WHEN p_query <> '' THEN
                    greatest(
                        similarity(coalesce(c.title,   ''), p_query),
                        similarity(coalesce(c.summary, ''), p_query)
                    )::FLOAT
                ELSE 0
            END AS trgm_score,
            -- Cosine similarity from pgvector (0 when no embedding provided)
            CASE
                WHEN p_embedding IS NOT NULL THEN
                    (1 - (e.embedding <=> p_embedding))::FLOAT
                ELSE 0
            END AS semantic_score
        FROM  public.clips c
        LEFT  JOIN public.clip_embeddings e ON e.clip_id = c.id
        WHERE c.is_archived = FALSE
          AND (
                c.user_id = p_user_id
                OR (p_include_public AND c.is_public = TRUE)
              )
          AND (
                p_query = ''
                OR c.fts @@ plainto_tsquery('simple', p_query)
                OR similarity(coalesce(c.title,   ''), p_query) > 0.15
                OR similarity(coalesce(c.summary, ''), p_query) > 0.10
              )
    )
    SELECT
        b.id,
        b.title,
        b.url,
        b.summary,
        b.platform,
        b.fts_rank,
        b.trgm_score,
        b.semantic_score,
        -- Weighted combination: FTS 40 %, trigram 20 %, semantic 40 %
        (b.fts_rank * 0.40 + b.trgm_score * 0.20 + b.semantic_score * 0.40)::FLOAT AS combined_score
    FROM base b
    ORDER BY combined_score DESC, b.fts_rank DESC
    LIMIT p_match_count;
END;
$$;

COMMENT ON FUNCTION public.smart_search IS
    'Hybrid search: FTS (40%) + trigram (20%) + semantic cosine (40%). '
    'Pass p_embedding=NULL to disable semantic component.';

-- ---------------------------------------------------------------------------
-- FUNCTION: omni_search
-- Cross-entity search returning clips, collections, and tags in a single call.
-- Useful for global search bar / command palette.
--
-- Parameters:
--   p_user_id     UUID  – restrict private entities to this user
--   p_query       TEXT  – search string
--   p_match_count INT   – max rows per entity type (default 5)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.omni_search(
    p_user_id     UUID,
    p_query       TEXT,
    p_match_count INT  DEFAULT 5
)
RETURNS TABLE (
    entity_type TEXT,    -- 'clip' | 'collection' | 'tag'
    entity_id   UUID,
    label       TEXT,    -- display name / title
    sub_label   TEXT,    -- url (clips) | description (collections) | NULL (tags)
    score       FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY

    -- Clips
    SELECT
        'clip'::TEXT,
        c.id,
        coalesce(c.title, c.url),
        c.url,
        ts_rank(c.fts, plainto_tsquery('simple', p_query))::FLOAT
    FROM  public.clips c
    WHERE c.is_archived = FALSE
      AND (c.user_id = p_user_id OR c.is_public)
      AND (
            c.fts @@ plainto_tsquery('simple', p_query)
            OR similarity(coalesce(c.title, ''), p_query) > 0.15
          )
    ORDER BY 5 DESC
    LIMIT p_match_count

    UNION ALL

    -- Collections
    SELECT
        'collection'::TEXT,
        col.id,
        col.name,
        col.description,
        similarity(col.name, p_query)::FLOAT
    FROM  public.collections col
    WHERE (col.user_id = p_user_id OR col.is_public)
      AND similarity(col.name, p_query) > 0.15
    ORDER BY 5 DESC
    LIMIT p_match_count

    UNION ALL

    -- Tags
    SELECT
        'tag'::TEXT,
        t.id,
        t.name,
        NULL::TEXT,
        similarity(t.name, p_query)::FLOAT
    FROM  public.tags t
    -- Only surface tags the user has actually used
    WHERE EXISTS (
        SELECT 1
        FROM   public.clip_tags ct
        JOIN   public.clips     c  ON c.id = ct.clip_id
        WHERE  ct.tag_id = t.id
          AND  c.user_id = p_user_id
    )
      AND similarity(t.name, p_query) > 0.20
    ORDER BY 5 DESC
    LIMIT p_match_count;
END;
$$;

COMMENT ON FUNCTION public.omni_search IS
    'Cross-entity search across clips, collections, and tags for global search bar.';
