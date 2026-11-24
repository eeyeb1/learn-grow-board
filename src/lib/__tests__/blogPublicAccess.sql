-- Verifies only the selected blog read-policy fixes. No test rows are retained.
BEGIN;

INSERT INTO public.blog_comments (id, user_id, blog_id, content)
VALUES
  ('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555', '1', 'Temporary public-post access test'),
  ('22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555555555', 'not-a-public-post', 'Temporary unknown-post access test');

INSERT INTO public.blog_likes (id, user_id, blog_id)
VALUES
  ('33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', '1'),
  ('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', 'not-a-public-post');

SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.blog_comments WHERE user_id = '55555555-5555-4555-8555-555555555555') <> 1 THEN
    RAISE EXCEPTION 'Blog comments must expose only comments attached to public posts';
  END IF;

  IF (SELECT COUNT(*) FROM public.blog_likes WHERE user_id = '55555555-5555-4555-8555-555555555555') <> 1 THEN
    RAISE EXCEPTION 'Blog likes must expose only likes attached to public posts';
  END IF;
END;
$$;

ROLLBACK;
