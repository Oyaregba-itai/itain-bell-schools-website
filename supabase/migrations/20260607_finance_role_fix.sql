-- Correction: Mr Segun is NOT an admin — he is the Head of Finance and should
-- have a normal teacher portal plus a Finance tab. Mrs Duru is the actual admin
-- and, since she also teaches, her portal should combine admin + teacher views.

-- 1. Revert Mr Segun back to a regular teacher
UPDATE public.user_roles SET role = 'teacher'
WHERE user_id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322';

-- Reset his super-admin flag back to the default (no longer relevant as a teacher)
UPDATE public.profiles SET is_super_admin = true
WHERE user_id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322';

-- 2. Flag Mr Segun as Head of Finance so his teacher portal shows a Finance tab
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_finance_head boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET is_finance_head = true
WHERE user_id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322';

-- 3. Make Mrs Goodness Duru the actual admin
UPDATE public.user_roles SET role = 'admin'
WHERE user_id = 'a4801043-8759-4da4-9e66-453f1e1485d3';
