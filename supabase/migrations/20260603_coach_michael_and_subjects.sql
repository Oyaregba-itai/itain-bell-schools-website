-- Add staff_type column to profiles for adjunct/full-time distinction
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_type VARCHAR(20) DEFAULT 'full_time'
  CHECK (staff_type IN ('full_time', 'adjunct', 'contract'));

-- Insert Coach Michael profile and role
INSERT INTO public.profiles (user_id, full_name, email, staff_type)
VALUES ('39ee5cab-7e4d-4795-a819-6960f71e56b4', 'Coach Michael', 'coach.michael@itainbellschool.com', 'adjunct')
ON CONFLICT ON CONSTRAINT profiles_user_id_key DO UPDATE SET full_name = 'Coach Michael', email = 'coach.michael@itainbellschool.com', staff_type = 'adjunct';

INSERT INTO public.user_roles (user_id, role)
VALUES ('39ee5cab-7e4d-4795-a819-6960f71e56b4', 'teacher')
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

-- Assign Diction (Year 3 to 6) to Coach Michael
UPDATE public.subjects SET teacher_id = '39ee5cab-7e4d-4795-a819-6960f71e56b4'
WHERE name = 'Diction' AND class_id IN (
  'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03',
  'fe8d2a00-6921-40bc-9759-55bc6ca49eb5',
  '0255c250-f106-42d9-9399-c3da696961a0',
  '765eed4a-7d21-49e1-8ca2-982b13f1b524'
);

-- Assign Creative Art (Year 1 to 6) to Mr. Oyebode
UPDATE public.subjects SET teacher_id = '3e0e43af-ae9c-4724-8040-54b01aec4a60'
WHERE name = 'Creative Art' AND class_id IN (
  '158b7a33-4844-4cf9-b999-c21ca495f01c',
  '522b62c0-889c-4ccf-85e5-e30e343fac2c',
  'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03',
  'fe8d2a00-6921-40bc-9759-55bc6ca49eb5',
  '0255c250-f106-42d9-9399-c3da696961a0',
  '765eed4a-7d21-49e1-8ca2-982b13f1b524'
);
