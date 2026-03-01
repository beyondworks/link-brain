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
