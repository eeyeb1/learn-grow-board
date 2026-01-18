-- Create company_profiles table for company-specific data
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_description TEXT,
  company_website TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table for posted roles
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  location_type TEXT NOT NULL DEFAULT 'remote',
  duration TEXT,
  hours_per_week TEXT,
  skill_level TEXT NOT NULL DEFAULT 'beginner',
  industry TEXT,
  skills TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  what_you_will_learn TEXT[] DEFAULT '{}',
  mentorship_details TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Company profiles RLS policies
CREATE POLICY "Company profiles are viewable by everyone" ON public.company_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own company profile" ON public.company_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile" ON public.company_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Jobs RLS policies
CREATE POLICY "Active jobs are viewable by everyone" ON public.jobs
  FOR SELECT USING (status = 'active');

CREATE POLICY "Companies can insert their own jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_profiles 
      WHERE id = company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their own jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.company_profiles 
      WHERE id = company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete their own jobs" ON public.jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.company_profiles 
      WHERE id = company_id AND user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add user_type to profiles table
ALTER TABLE public.profiles ADD COLUMN user_type TEXT DEFAULT 'applicant';