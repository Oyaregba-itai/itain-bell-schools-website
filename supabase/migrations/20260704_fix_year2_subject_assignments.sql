-- Fix Year 2 subject assignments for Miss Elizabeth Adedeji
-- When the old Year 2 teacher (Mrs Kushoro) was deleted from auth.users,
-- the ON DELETE SET NULL constraint nulled subject_assignments.teacher_id
-- for all her rows, causing can_access_result() to return false for
-- Miss Elizabeth and blocking all her result inserts/updates.

UPDATE public.subject_assignments
SET teacher_id = 'af885a73-6e0c-4757-b9b6-e00b8fcc7c8c'  -- Miss Elizabeth Adedeji
WHERE class_id = '522b62c0-889c-4ccf-85e5-e30e343fac2c'  -- Year 2
  AND teacher_id IS NULL;
