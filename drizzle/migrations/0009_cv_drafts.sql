CREATE TABLE public.cv_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  target text NOT NULL CHECK (char_length(target) BETWEEN 1 AND 120),
  placement_ids uuid[] NOT NULL DEFAULT '{}',
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cv_drafts_user_idx ON public.cv_drafts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_drafts TO authenticated;
GRANT ALL ON public.cv_drafts TO service_role;
ALTER TABLE public.cv_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cv drafts read" ON public.cv_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own cv drafts insert" ON public.cv_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cv drafts update" ON public.cv_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cv drafts delete" ON public.cv_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_cv_drafts_updated_at BEFORE UPDATE ON public.cv_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();