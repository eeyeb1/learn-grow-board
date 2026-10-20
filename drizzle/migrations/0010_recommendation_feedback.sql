CREATE TABLE public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  feedback text NOT NULL CHECK (feedback IN ('hidden','relevant','not_relevant')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_feedback TO authenticated;
GRANT ALL ON public.recommendation_feedback TO service_role;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rec feedback read" ON public.recommendation_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own rec feedback insert" ON public.recommendation_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own rec feedback update" ON public.recommendation_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own rec feedback delete" ON public.recommendation_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_recommendation_feedback_updated_at BEFORE UPDATE ON public.recommendation_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();