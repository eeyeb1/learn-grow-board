DROP POLICY "Anyone can view comments" ON public.blog_comments;
CREATE POLICY "Anyone can view comments"
ON public.blog_comments
FOR SELECT
TO anon, authenticated
USING (
  blog_id = ANY (ARRAY[
    '1', '2', '3', '4', '5', '6',
    'how-to-stand-out', 'mentoring-beginners',
    'experience-vs-exploitation', 'building-portfolio'
  ]::text[])
);

DROP POLICY "Users can view all likes" ON public.blog_likes;
CREATE POLICY "Users can view all likes"
ON public.blog_likes
FOR SELECT
TO anon, authenticated
USING (
  blog_id = ANY (ARRAY[
    '1', '2', '3', '4', '5', '6',
    'how-to-stand-out', 'mentoring-beginners',
    'experience-vs-exploitation', 'building-portfolio'
  ]::text[])
);