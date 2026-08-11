ALTER POLICY users_select ON public.users USING (((auth_id = auth.uid()) OR ( SELECT is_admin())));
ALTER POLICY users_update ON public.users USING (((auth_id = auth.uid()) OR ( SELECT is_admin())));
ALTER POLICY users_delete ON public.users USING (( SELECT is_admin()));
ALTER POLICY categories_all ON public.categories USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY collections_select ON public.collections USING (((is_public = true) OR (user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY collections_update ON public.collections USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY collections_delete ON public.collections USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY clips_select ON public.clips USING (((is_public = true) OR (user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY clips_update ON public.clips USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY clips_delete ON public.clips USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY clip_contents_select ON public.clip_contents USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_contents.clip_id) AND ((c.is_public = true) OR (c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_contents_update ON public.clip_contents USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_contents.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_contents_delete ON public.clip_contents USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_contents.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_collections_all ON public.clip_collections USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_collections.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_tags_all ON public.clip_tags USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_tags.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY tags_delete ON public.tags USING (( SELECT is_admin()));
ALTER POLICY clip_chats_all ON public.clip_chats USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_chats.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY subscriptions_select ON public.subscriptions USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY subscriptions_insert ON public.subscriptions WITH CHECK (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY subscriptions_update ON public.subscriptions USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY credits_select ON public.credits USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY credits_insert ON public.credits WITH CHECK (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY credits_update ON public.credits USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY follows_delete ON public.follows USING (((follower_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY likes_delete ON public.likes USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY notifications_select ON public.notifications USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY notifications_update ON public.notifications USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY notifications_delete ON public.notifications USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY notifications_insert ON public.notifications WITH CHECK (( SELECT is_admin()));
ALTER POLICY api_keys_all ON public.api_keys USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY webhooks_all ON public.webhooks USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY announcements_select ON public.announcements USING (((is_active = true) OR ( SELECT is_admin())));
ALTER POLICY announcements_insert ON public.announcements WITH CHECK (( SELECT is_admin()));
ALTER POLICY announcements_update ON public.announcements USING (( SELECT is_admin()));
ALTER POLICY announcements_delete ON public.announcements USING (( SELECT is_admin()));
ALTER POLICY clip_embeddings_select ON public.clip_embeddings USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_embeddings.clip_id) AND ((c.is_public = true) OR (c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_embeddings_insert ON public.clip_embeddings WITH CHECK ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_embeddings.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_embeddings_update ON public.clip_embeddings USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_embeddings.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_embeddings_delete ON public.clip_embeddings USING ((EXISTS ( SELECT 1
   FROM clips c
  WHERE ((c.id = clip_embeddings.clip_id) AND ((c.user_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin()))))));
ALTER POLICY clip_annotations_select ON public.clip_annotations USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY clip_annotations_update ON public.clip_annotations USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY clip_annotations_delete ON public.clip_annotations USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY reading_progress_all ON public.reading_progress USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ( SELECT is_admin())));
ALTER POLICY tag_usage_stats_insert ON public.tag_usage_stats WITH CHECK (( SELECT is_admin()));
ALTER POLICY tag_usage_stats_update ON public.tag_usage_stats USING (( SELECT is_admin()));
