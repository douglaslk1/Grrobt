-- Add admin role to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- Create admin policies for reports table
CREATE POLICY "admins_can_view_all_reports" ON public.reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admins_can_update_reports" ON public.reports FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

-- Create admin policies for all tables (read access)
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  ) OR auth.uid() = id
);

CREATE POLICY "admins_can_view_all_posts" ON public.posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  ) OR is_public = true OR author_id = auth.uid()
);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role IN ('admin', 'moderator')
  );
END;
$$;
