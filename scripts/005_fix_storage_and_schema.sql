-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audio', 'audio', true),
  ('video', 'video', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for audio bucket
CREATE POLICY "Users can upload their own audio files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Audio files are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio');

CREATE POLICY "Users can update their own audio files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" ON storage.objects
  FOR DELETE USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for video bucket
CREATE POLICY "Users can upload their own video files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'video' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Video files are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'video');

CREATE POLICY "Users can update their own video files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'video' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video files" ON storage.objects
  FOR DELETE USING (bucket_id = 'video' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for avatars bucket
CREATE POLICY "Users can upload their own avatar files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar files are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar files" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix posts table to allow audio-only posts
ALTER TABLE public.posts ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.posts ADD CONSTRAINT posts_content_or_media_check 
  CHECK (content IS NOT NULL OR audio_url IS NOT NULL OR video_url IS NOT NULL);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
