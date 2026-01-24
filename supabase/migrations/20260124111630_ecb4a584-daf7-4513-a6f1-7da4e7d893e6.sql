-- Add expires_at column to jobs table for job expiry functionality
ALTER TABLE public.jobs 
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;

-- Add an index for efficient sorting and filtering by dates
CREATE INDEX idx_jobs_created_at ON public.jobs (created_at DESC);
CREATE INDEX idx_jobs_expires_at ON public.jobs (expires_at) WHERE expires_at IS NOT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.jobs.expires_at IS 'Optional expiry date for job listings. NULL means the job does not expire.';