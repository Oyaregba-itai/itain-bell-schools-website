-- Add email field to profiles table
ALTER TABLE public.profiles ADD COLUMN email TEXT;

-- Create index for email lookup
CREATE INDEX idx_profiles_email ON public.profiles(email);
