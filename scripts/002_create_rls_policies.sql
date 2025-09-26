-- RLS Policies for profiles table
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for posts table
CREATE POLICY "posts_select_public" ON public.posts FOR SELECT USING (
  is_public = true OR author_id = auth.uid()
);
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for tags table (public read, authenticated write)
CREATE POLICY "tags_select_all" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags_insert_authenticated" ON public.tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for post_tags table
CREATE POLICY "post_tags_select_all" ON public.post_tags FOR SELECT USING (true);
CREATE POLICY "post_tags_insert_own_post" ON public.post_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
);
CREATE POLICY "post_tags_delete_own_post" ON public.post_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
);

-- RLS Policies for follows table
CREATE POLICY "follows_select_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for reactions table
CREATE POLICY "reactions_select_all" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_own" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_update_own" ON public.reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reactions_delete_own" ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments table
CREATE POLICY "comments_select_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for messages table
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE USING (
  auth.uid() = recipient_id -- Only recipient can mark as read
);

-- RLS Policies for reports table
CREATE POLICY "reports_select_own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RLS Policies for notifications table
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
