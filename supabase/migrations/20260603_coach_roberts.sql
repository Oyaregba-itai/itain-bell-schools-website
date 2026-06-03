INSERT INTO public.profiles (user_id, full_name, email, staff_type)
VALUES ('4066acfe-5470-4972-b869-9f3b993c1319', 'Coach Roberts', 'coach.roberts@itainbellschool.com', 'adjunct')
ON CONFLICT ON CONSTRAINT profiles_user_id_key DO UPDATE SET full_name = 'Coach Roberts', email = 'coach.roberts@itainbellschool.com', staff_type = 'adjunct';

INSERT INTO public.user_roles (user_id, role)
VALUES ('4066acfe-5470-4972-b869-9f3b993c1319', 'teacher')
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

-- Assign Diction: Discoverers, Noble, Year 1, Year 2
UPDATE public.subjects SET teacher_id = '4066acfe-5470-4972-b869-9f3b993c1319'
WHERE name = 'Diction' AND class_id IN (
  'e44ade7a-596b-4711-8dcc-41c0b8224450',
  '159f91be-a301-417e-97f2-97a0b762f2e6',
  '158b7a33-4844-4cf9-b999-c21ca495f01c',
  '522b62c0-889c-4ccf-85e5-e30e343fac2c'
);
