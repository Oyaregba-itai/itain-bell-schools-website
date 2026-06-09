-- New Year 2 class teacher: Miss Elizabeth Adedeji
-- Replaces Mrs Kushoro Adedayo (a0294012-e1b1-4716-956c-acba4b620a6f)

DO $$
DECLARE
  new_id UUID := 'af885a73-6e0c-4757-b9b6-e00b8fcc7c8c';
  old_id UUID := 'a0294012-e1b1-4716-956c-acba4b620a6f';
BEGIN

  -- 1. Create profile for Miss Elizabeth Adedeji
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new_id, 'Miss Elizabeth Adedeji', 'elizabeth.adedeji@itainbell.school')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  -- 2. Assign teacher role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_id, 'teacher')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Transfer all Year 2 subject assignments
  UPDATE public.subjects
  SET teacher_id = new_id
  WHERE teacher_id = old_id;

  -- 4. Transfer teacher_classes entries
  UPDATE public.teacher_classes
  SET teacher_id = new_id
  WHERE teacher_id = old_id;

  -- 5. Make Miss Elizabeth head of Year 2
  UPDATE public.classes
  SET head_teacher_id = new_id
  WHERE head_teacher_id = old_id;

  -- 6. Delete Mrs Kushoro's profile, roles, and auth account
  DELETE FROM public.user_roles WHERE user_id = old_id;
  DELETE FROM public.profiles WHERE user_id = old_id;
  DELETE FROM auth.users WHERE id = old_id;

END $$;
