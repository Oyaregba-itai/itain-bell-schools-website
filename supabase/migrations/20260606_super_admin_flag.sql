-- Add is_super_admin flag to profiles table
-- Regular admins (is_super_admin = false) share the same dashboard as super admins
-- but cannot delete users, results, events, fees, or payments.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT true;

-- Mr Segun is an admin but should not be able to delete records
UPDATE public.profiles
SET is_super_admin = false
WHERE user_id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322';

-- Also ensure his role is set to admin (in case it was still teacher)
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322';
