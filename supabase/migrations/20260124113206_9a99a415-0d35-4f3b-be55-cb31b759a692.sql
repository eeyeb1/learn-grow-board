-- Add parent_comment_id to support replies (one level deep)
ALTER TABLE public.blog_comments
ADD COLUMN parent_comment_id UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE DEFAULT NULL;

-- Index for faster queries on parent comments
CREATE INDEX idx_blog_comments_parent ON public.blog_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

COMMENT ON COLUMN public.blog_comments.parent_comment_id IS 'Reference to parent comment for replies. NULL means root comment.';