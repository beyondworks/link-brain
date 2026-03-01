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
