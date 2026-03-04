-- =============================================================================
-- 001_initial_schema.sql
-- Linkbrain v2 - Core Schema
-- =============================================================================
-- Independently runnable. Requires: pgcrypto (bundled with Supabase).
-- Run order: 001 -> 002 -> 003 -> 004 -> 005 -> 006
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM-like CHECK helper domains (avoid separate ENUM types for flexibility)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- TABLE: users
-- Mirrors auth.users; extended with app-level profile data.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id           UUID        NOT NULL UNIQUE,          -- references auth.users(id)
    email             TEXT        NOT NULL UNIQUE,
    display_name      TEXT,
    avatar_url        TEXT,
    bio               TEXT,
    language          TEXT        NOT NULL DEFAULT 'ko',
    theme             TEXT        NOT NULL DEFAULT 'system'
                                  CHECK (theme IN ('light', 'dark', 'system')),
    role              TEXT        NOT NULL DEFAULT 'user'
                                  CHECK (role IN ('user', 'admin')),
    openai_api_key    TEXT,       -- stored encrypted at application layer
    google_ai_key     TEXT,       -- stored encrypted at application layer
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Application user profiles, linked to Supabase auth.users.';

-- ---------------------------------------------------------------------------
-- TABLE: categories
-- User-defined clip categories (folders/labels).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    color      TEXT,                          -- hex color code, e.g. '#3B82F6'
    sort_order INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS 'User-defined categories for organising clips.';

-- ---------------------------------------------------------------------------
-- TABLE: collections
-- Curated sets of clips; can be made public.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    color       TEXT,
    is_public   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.collections IS 'Curated collections of clips, optionally public.';

-- ---------------------------------------------------------------------------
-- TABLE: clips
-- Core content unit. Stores metadata about a saved URL/article.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clips (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Source
    url            TEXT        NOT NULL,
    title          TEXT,
    summary        TEXT,
    image          TEXT,                       -- OG / hero image URL
    platform       TEXT        CHECK (platform IN (
                                   'web', 'twitter', 'youtube', 'github',
                                   'medium', 'substack', 'reddit', 'linkedin',
                                   'instagram', 'tiktok', 'other'
                               )),
    author         TEXT,
    author_handle  TEXT,
    author_avatar  TEXT,
    read_time      INTEGER,                    -- estimated read time in seconds

    -- AI metadata
    ai_score       NUMERIC(4,2),              -- AI-computed relevance score 0-10

    -- Status flags
    is_favorite    BOOLEAN     NOT NULL DEFAULT FALSE,
    is_read_later  BOOLEAN     NOT NULL DEFAULT FALSE,
    is_archived    BOOLEAN     NOT NULL DEFAULT FALSE,
    is_public      BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Organisation
    category_id    UUID        REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Engagement counters (denormalised for read performance)
    views          INTEGER     NOT NULL DEFAULT 0,
    likes_count    INTEGER     NOT NULL DEFAULT 0,

    -- Full-Text Search (generated, auto-updated)
    fts            TSVECTOR    GENERATED ALWAYS AS (
                       to_tsvector('simple',
                           coalesce(title,   '') || ' ' ||
                           coalesce(summary, '') || ' ' ||
                           coalesce(author,  '')
                       )
                   ) STORED,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clips IS 'Saved bookmarks / clips with metadata and AI enrichment.';
COMMENT ON COLUMN public.clips.fts IS 'Generated tsvector for full-text search across title, summary, author.';

-- ---------------------------------------------------------------------------
-- TABLE: clip_contents
-- Stores heavy content separately to keep clips table lean.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_contents (
    clip_id          UUID   PRIMARY KEY REFERENCES public.clips(id) ON DELETE CASCADE,
    html_content     TEXT,
    content_markdown TEXT,
    raw_markdown     TEXT
);

COMMENT ON TABLE public.clip_contents IS 'Full page content for a clip; separated for read performance.';

-- ---------------------------------------------------------------------------
-- TABLE: clip_collections  (join)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_collections (
    clip_id       UUID NOT NULL REFERENCES public.clips(id)       ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    PRIMARY KEY (clip_id, collection_id)
);

-- ---------------------------------------------------------------------------
-- TABLE: tags
-- Global tag registry; names are unique.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

COMMENT ON TABLE public.tags IS 'Global tag dictionary; clips reference tags via clip_tags.';

-- ---------------------------------------------------------------------------
-- TABLE: clip_tags  (join)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_tags (
    clip_id UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES public.tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (clip_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- TABLE: clip_chats
-- AI chat history per clip.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_chats (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id   UUID        NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
    role      TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content   TEXT        NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clip_chats IS 'AI conversation history attached to individual clips.';

-- ---------------------------------------------------------------------------
-- TABLE: subscriptions
-- One subscription record per user (UNIQUE constraint on user_id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    tier                 TEXT        NOT NULL DEFAULT 'free'
                                     CHECK (tier IN ('free', 'starter', 'pro', 'team')),
    status               TEXT        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'paused')),
    lemon_squeezy_id     TEXT,       -- Lemon Squeezy subscription ID
    trial_start_date     TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'User billing subscription, linked to Lemon Squeezy.';

-- ---------------------------------------------------------------------------
-- TABLE: credits
-- Monthly AI credit tracking; reset_date drives the billing cycle.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credits (
    user_id        UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    monthly_used   INTEGER     NOT NULL DEFAULT 0,
    monthly_limit  INTEGER     NOT NULL DEFAULT 50,
    reset_date     DATE        NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month')::DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.credits IS 'Monthly AI credit usage and limits per user.';

-- ---------------------------------------------------------------------------
-- TABLE: follows
-- Social graph: user -> user.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id),
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.follows IS 'Social follow graph between users.';

-- ---------------------------------------------------------------------------
-- TABLE: likes
-- User likes on public clips.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.likes (
    user_id    UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
    clip_id    UUID        NOT NULL REFERENCES public.clips(id)  ON DELETE CASCADE,
    PRIMARY KEY (user_id, clip_id),
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.likes IS 'Clip likes by users; drives likes_count denormalisation.';

-- ---------------------------------------------------------------------------
-- TABLE: notifications
-- In-app notifications for social activity.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type      TEXT        NOT NULL,   -- e.g. 'like', 'follow', 'comment', 'system'
    actor_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    clip_id   UUID        REFERENCES public.clips(id) ON DELETE SET NULL,
    message   TEXT,
    is_read   BOOLEAN     NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'In-app notification feed per user.';

-- ---------------------------------------------------------------------------
-- TABLE: api_keys
-- User-managed API keys (only hash stored; prefix for display).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    key_hash     TEXT        NOT NULL UNIQUE,
    key_prefix   TEXT        NOT NULL,  -- first 8 chars, shown in UI
    name         TEXT        NOT NULL,
    last_used_at TIMESTAMPTZ,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS 'Hashed API keys for programmatic access; raw key never stored.';

-- ---------------------------------------------------------------------------
-- TABLE: webhooks
-- Outbound webhooks registered by users.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhooks (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    url       TEXT        NOT NULL,
    events    TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. '{clip.created, clip.updated}'
    secret    TEXT,                               -- HMAC signing secret
    is_active BOOLEAN     NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhooks IS 'User-registered outbound webhook endpoints.';

-- ---------------------------------------------------------------------------
-- TABLE: announcements
-- Platform-wide banners / notices managed by admins.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title     TEXT        NOT NULL,
    content   TEXT        NOT NULL,
    type      TEXT        NOT NULL DEFAULT 'info'
                          CHECK (type IN ('info', 'warning', 'success', 'error')),
    is_active BOOLEAN     NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at   TIMESTAMPTZ,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.announcements IS 'Admin-managed platform announcements and banners.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_auth_id  ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email    ON public.users(email);

-- clips — hot-path queries
CREATE INDEX IF NOT EXISTS idx_clips_user_id          ON public.clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_user_created     ON public.clips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_user_archived    ON public.clips(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_clips_user_favorite    ON public.clips(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_clips_user_read_later  ON public.clips(user_id, is_read_later);
CREATE INDEX IF NOT EXISTS idx_clips_category_id      ON public.clips(category_id);
CREATE INDEX IF NOT EXISTS idx_clips_platform         ON public.clips(platform);
CREATE INDEX IF NOT EXISTS idx_clips_is_public        ON public.clips(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_clips_fts              ON public.clips USING GIN (fts);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- collections
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);

-- clip_collections
CREATE INDEX IF NOT EXISTS idx_clip_collections_collection_id ON public.clip_collections(collection_id);

-- clip_tags
CREATE INDEX IF NOT EXISTS idx_clip_tags_tag_id ON public.clip_tags(tag_id);

-- clip_chats
CREATE INDEX IF NOT EXISTS idx_clip_chats_clip_id ON public.clip_chats(clip_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id       ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread   ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- follows
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- likes
CREATE INDEX IF NOT EXISTS idx_likes_clip_id ON public.likes(clip_id);

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks(user_id);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, starts_at, ends_at);

-- =============================================================================
-- updated_at auto-refresh trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'categories', 'collections', 'clips',
        'subscriptions', 'credits'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;
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
-- =============================================================================
-- 003_annotations.sql
-- Linkbrain v2 - Clip Annotations (Highlights & Notes)
-- =============================================================================
-- Depends on: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: clip_annotations
-- Stores user highlights and inline notes on saved clip content.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_annotations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id       UUID        NOT NULL REFERENCES public.clips(id)  ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,

    -- Annotation type
    type          TEXT        NOT NULL CHECK (type IN ('highlight', 'note', 'bookmark')),

    -- The text the user selected (may be NULL for pure bookmark annotations)
    selected_text TEXT,

    -- User's written note attached to the annotation (optional)
    note_text     TEXT,

    -- DOM / scroll position data so the UI can re-anchor the annotation
    -- Expected shape: { "startOffset": 123, "endOffset": 456, "xpath": "...", "scrollY": 789 }
    position_data JSONB,

    -- Visual colour used to render the highlight
    color         TEXT        NOT NULL DEFAULT 'yellow'
                              CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'purple', 'orange')),

    timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.clip_annotations IS 'User highlights and inline notes on clip content.';
COMMENT ON COLUMN public.clip_annotations.position_data IS
    'JSON anchor for the annotation: startOffset, endOffset, xpath, scrollY.';
COMMENT ON COLUMN public.clip_annotations.selected_text IS
    'The raw text the user highlighted; NULL for bookmark-type annotations.';

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- Primary access pattern: fetch all annotations for a clip by a specific user
CREATE INDEX IF NOT EXISTS idx_clip_annotations_clip_user
    ON public.clip_annotations(clip_id, user_id);

-- Secondary: list all annotations made by a user across all clips
CREATE INDEX IF NOT EXISTS idx_clip_annotations_user_id
    ON public.clip_annotations(user_id);

-- Filter by annotation type (highlight vs note vs bookmark)
CREATE INDEX IF NOT EXISTS idx_clip_annotations_type
    ON public.clip_annotations(clip_id, type);
-- =============================================================================
-- 004_reading_progress.sql
-- Linkbrain v2 - Reading Progress Tracking
-- =============================================================================
-- Depends on: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: reading_progress
-- Tracks per-user scroll position and time spent on each clip.
-- Composite PK (clip_id, user_id) ensures one progress record per pair.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_progress (
    clip_id             UUID        NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (clip_id, user_id),

    -- Scroll depth as a percentage (0–100)
    scroll_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (scroll_percentage >= 0 AND scroll_percentage <= 100),

    -- Cumulative seconds the user has spent reading the clip
    time_spent_seconds  INTEGER     NOT NULL DEFAULT 0
                        CHECK (time_spent_seconds >= 0),

    -- NULL until the user reaches 100 % or explicitly marks as read
    completed_at        TIMESTAMPTZ,

    -- Updated on every progress sync from the client
    last_read_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.reading_progress IS 'Per-user reading progress state for each clip.';
COMMENT ON COLUMN public.reading_progress.scroll_percentage  IS 'Deepest scroll position reached, 0–100 %.';
COMMENT ON COLUMN public.reading_progress.time_spent_seconds IS 'Total active reading time accumulated across sessions.';
COMMENT ON COLUMN public.reading_progress.completed_at       IS 'Timestamp when the clip was first marked as fully read.';

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- Fetch all in-progress clips for a user (dashboard / continue reading)
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id
    ON public.reading_progress(user_id);

-- Find users who have read a specific clip (analytics / social proof)
CREATE INDEX IF NOT EXISTS idx_reading_progress_clip_id
    ON public.reading_progress(clip_id);

-- Filter to incomplete reads for a user (scroll_percentage < 100)
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_incomplete
    ON public.reading_progress(user_id, scroll_percentage)
    WHERE completed_at IS NULL;
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
-- =============================================================================
-- 006_rls_policies.sql
-- Linkbrain v2 - Row-Level Security Policies
-- =============================================================================
-- Depends on: 001_initial_schema.sql, 002_pgvector_embeddings.sql,
--             003_annotations.sql, 004_reading_progress.sql
-- =============================================================================
-- Convention:
--   auth.uid()  – the authenticated user's UUID from Supabase JWT
--   auth.role() – 'authenticated' | 'anon' | 'service_role'
--
-- Admin bypass: any row where the calling user has role = 'admin' in
-- public.users passes all policies via a shared helper function.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: is_admin()
-- Returns TRUE when the current JWT user has role='admin' in public.users.
-- SECURITY DEFINER so it can read the users table without recursion issues.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   public.users
        WHERE  auth_id = auth.uid()
          AND  role    = 'admin'
    );
$$;

COMMENT ON FUNCTION public.is_admin IS
    'Returns TRUE when the authenticated JWT user has admin role.';

-- =============================================================================
-- Enable RLS on all application tables
-- =============================================================================
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_contents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_collections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_chats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_embeddings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_annotations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_usage_stats     ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TABLE: users
-- =============================================================================

-- Anyone can read their own profile; admins read all
CREATE POLICY users_select ON public.users
    FOR SELECT USING (
        auth_id = auth.uid()
        OR is_admin()
    );

-- A user can insert their own profile row (signup flow)
CREATE POLICY users_insert ON public.users
    FOR INSERT WITH CHECK (
        auth_id = auth.uid()
    );

-- A user can update only their own profile
CREATE POLICY users_update ON public.users
    FOR UPDATE USING (
        auth_id = auth.uid()
        OR is_admin()
    );

-- Only admins can delete user rows (soft-delete preferred at app layer)
CREATE POLICY users_delete ON public.users
    FOR DELETE USING (is_admin());

-- =============================================================================
-- TABLE: categories
-- =============================================================================

CREATE POLICY categories_all ON public.categories
    FOR ALL USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: collections
-- =============================================================================

-- Public collections are readable by everyone
CREATE POLICY collections_select ON public.collections
    FOR SELECT USING (
        is_public = TRUE
        OR user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY collections_insert ON public.collections
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

CREATE POLICY collections_update ON public.collections
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY collections_delete ON public.collections
    FOR DELETE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: clips
-- =============================================================================

-- Public clips are readable by anyone (authenticated or anon)
CREATE POLICY clips_select ON public.clips
    FOR SELECT USING (
        is_public = TRUE
        OR user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY clips_insert ON public.clips
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

CREATE POLICY clips_update ON public.clips
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY clips_delete ON public.clips
    FOR DELETE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: clip_contents
-- Access mirrors the parent clip's visibility.
-- =============================================================================

CREATE POLICY clip_contents_select ON public.clip_contents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.is_public = TRUE
                       OR c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

CREATE POLICY clip_contents_insert ON public.clip_contents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY clip_contents_update ON public.clip_contents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

CREATE POLICY clip_contents_delete ON public.clip_contents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

-- =============================================================================
-- TABLE: clip_collections
-- User can manage collection membership for clips they own.
-- =============================================================================

CREATE POLICY clip_collections_all ON public.clip_collections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

-- =============================================================================
-- TABLE: clip_tags
-- =============================================================================

CREATE POLICY clip_tags_all ON public.clip_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

-- =============================================================================
-- TABLE: tags
-- Tags are global; any authenticated user can read/create; only admins delete.
-- =============================================================================

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON public.tags
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY tags_insert ON public.tags
    FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY tags_delete ON public.tags
    FOR DELETE USING (is_admin());

-- =============================================================================
-- TABLE: clip_chats
-- =============================================================================

CREATE POLICY clip_chats_all ON public.clip_chats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

-- =============================================================================
-- TABLE: subscriptions
-- =============================================================================

CREATE POLICY subscriptions_select ON public.subscriptions
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- Inserts and updates performed by server-side functions / webhooks (service role)
CREATE POLICY subscriptions_insert ON public.subscriptions
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY subscriptions_update ON public.subscriptions
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: credits
-- =============================================================================

CREATE POLICY credits_select ON public.credits
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY credits_insert ON public.credits
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY credits_update ON public.credits
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: follows
-- Anyone can view follows (for follower/following counts).
-- Users can only insert/delete their own follow records.
-- =============================================================================

CREATE POLICY follows_select ON public.follows
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY follows_insert ON public.follows
    FOR INSERT WITH CHECK (
        follower_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

CREATE POLICY follows_delete ON public.follows
    FOR DELETE USING (
        follower_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: likes
-- Authenticated users can see all likes; manage only their own.
-- =============================================================================

CREATE POLICY likes_select ON public.likes
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY likes_insert ON public.likes
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

CREATE POLICY likes_delete ON public.likes
    FOR DELETE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: notifications
-- Users can only see and manage their own notifications.
-- =============================================================================

CREATE POLICY notifications_select ON public.notifications
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- Notifications are created by server-side triggers / functions; users can only
-- update (mark as read) and delete their own.
CREATE POLICY notifications_update ON public.notifications
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY notifications_delete ON public.notifications
    FOR DELETE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- Server-side insert (service role bypasses RLS; this policy covers authenticated inserts)
CREATE POLICY notifications_insert ON public.notifications
    FOR INSERT WITH CHECK (is_admin());

-- =============================================================================
-- TABLE: api_keys
-- =============================================================================

CREATE POLICY api_keys_all ON public.api_keys
    FOR ALL USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: webhooks
-- =============================================================================

CREATE POLICY webhooks_all ON public.webhooks
    FOR ALL USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: announcements
-- Everyone can read active announcements; only admins can write.
-- =============================================================================

CREATE POLICY announcements_select ON public.announcements
    FOR SELECT USING (
        is_active = TRUE
        OR is_admin()
    );

CREATE POLICY announcements_insert ON public.announcements
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY announcements_update ON public.announcements
    FOR UPDATE USING (is_admin());

CREATE POLICY announcements_delete ON public.announcements
    FOR DELETE USING (is_admin());

-- =============================================================================
-- TABLE: clip_embeddings
-- Access mirrors the parent clip.
-- =============================================================================

CREATE POLICY clip_embeddings_select ON public.clip_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.is_public = TRUE
                       OR c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

-- Embeddings are written by server-side workers (service role); this policy
-- covers any authenticated path.
CREATE POLICY clip_embeddings_insert ON public.clip_embeddings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

CREATE POLICY clip_embeddings_update ON public.clip_embeddings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

CREATE POLICY clip_embeddings_delete ON public.clip_embeddings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.clips c
            WHERE  c.id = clip_id
              AND  (
                       c.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR is_admin()
                   )
        )
    );

-- =============================================================================
-- TABLE: clip_annotations
-- =============================================================================

CREATE POLICY clip_annotations_select ON public.clip_annotations
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY clip_annotations_insert ON public.clip_annotations
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

CREATE POLICY clip_annotations_update ON public.clip_annotations
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY clip_annotations_delete ON public.clip_annotations
    FOR DELETE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: reading_progress
-- =============================================================================

CREATE POLICY reading_progress_all ON public.reading_progress
    FOR ALL USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        OR is_admin()
    );

-- =============================================================================
-- TABLE: tag_usage_stats
-- All authenticated users can read; only service role / admin can write.
-- =============================================================================

CREATE POLICY tag_usage_stats_select ON public.tag_usage_stats
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY tag_usage_stats_insert ON public.tag_usage_stats
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY tag_usage_stats_update ON public.tag_usage_stats
    FOR UPDATE USING (is_admin());

-- =============================================================================
-- Notes for deployment
-- =============================================================================
-- 1. Service-role key bypasses all RLS policies (used by backend workers and
--    Supabase Edge Functions that write embeddings, notifications, credits).
-- 2. The anon role can read public clips and active announcements via the
--    policies above; no other table is accessible without authentication.
-- 3. To allow public user profile reads (e.g. for follower pages), add a
--    separate SELECT policy on public.users WHERE is_public = TRUE once that
--    column is added in a future migration.
-- =============================================================================
-- 007_user_creation_trigger.sql
-- Auto-create public.users row when auth.users is created
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  );

  -- Create default credits row
  INSERT INTO public.credits (user_id)
  SELECT id FROM public.users WHERE auth_id = NEW.id;

  -- Create default subscription row
  INSERT INTO public.subscriptions (user_id)
  SELECT id FROM public.users WHERE auth_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle user updates (e.g., avatar change from Google)
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    display_name = COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', public.users.display_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', public.users.avatar_url),
    updated_at = now()
  WHERE auth_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();
