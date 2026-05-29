ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS warden_progress jsonb DEFAULT '{}';
