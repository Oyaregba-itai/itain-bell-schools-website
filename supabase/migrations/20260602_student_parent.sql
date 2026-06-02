-- Add email column to profiles (required by create-user edge function)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
