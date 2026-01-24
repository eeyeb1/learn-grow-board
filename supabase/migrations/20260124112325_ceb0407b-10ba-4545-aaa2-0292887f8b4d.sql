-- Create blog_likes table for tracking post likes
CREATE TABLE public.blog_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blog_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate likes
CREATE UNIQUE INDEX idx_blog_likes_user_blog ON public.blog_likes (user_id, blog_id);

-- Enable RLS
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_likes
CREATE POLICY "Users can view all likes" 
  ON public.blog_likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can add their own likes" 
  ON public.blog_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
  ON public.blog_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Create blog_comments table
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blog_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_blog_comments_blog_id ON public.blog_comments (blog_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_comments
CREATE POLICY "Anyone can view comments" 
  ON public.blog_comments FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can add comments" 
  ON public.blog_comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
  ON public.blog_comments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.blog_comments FOR DELETE 
  USING (auth.uid() = user_id);

-- Create saved_blogs table
CREATE TABLE public.saved_blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blog_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate saves
CREATE UNIQUE INDEX idx_saved_blogs_user_blog ON public.saved_blogs (user_id, blog_id);

-- Enable RLS
ALTER TABLE public.saved_blogs ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_blogs
CREATE POLICY "Users can view their own saved blogs" 
  ON public.saved_blogs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save blogs" 
  ON public.saved_blogs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave blogs" 
  ON public.saved_blogs FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for updating comments timestamp
CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();