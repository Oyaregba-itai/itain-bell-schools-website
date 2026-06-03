-- Insert Miss Temitope Olawunmi profile and role
INSERT INTO public.profiles (user_id, full_name, email)
VALUES ('fca59c55-085d-428e-aec0-b2b1b2c0346c', 'Miss Temitope Olawunmi', 'temitope.olawunmi@itainbellschool.com')
ON CONFLICT ON CONSTRAINT profiles_user_id_key DO UPDATE SET full_name = 'Miss Temitope Olawunmi', email = 'temitope.olawunmi@itainbellschool.com';

INSERT INTO public.user_roles (user_id, role)
VALUES ('fca59c55-085d-428e-aec0-b2b1b2c0346c', 'teacher')
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

-- Year 4: Humanities, CRK, Life Skills, Global Perspectives, Quantitative Reasoning, Verbal Reasoning
UPDATE public.subjects SET teacher_id = 'fca59c55-085d-428e-aec0-b2b1b2c0346c'
WHERE class_id = 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5'
AND name IN ('Humanities', 'CRK', 'Life Skills', 'Global Perspectives', 'Quantitative Reasoning', 'Verbal Reasoning');

-- Year 3: Life Skills, Global Perspectives
UPDATE public.subjects SET teacher_id = 'fca59c55-085d-428e-aec0-b2b1b2c0346c'
WHERE class_id = 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03'
AND name IN ('Life Skills', 'Global Perspectives');

-- Year 5: Life Skills, Global Perspectives
UPDATE public.subjects SET teacher_id = 'fca59c55-085d-428e-aec0-b2b1b2c0346c'
WHERE class_id = '0255c250-f106-42d9-9399-c3da696961a0'
AND name IN ('Life Skills', 'Global Perspectives');

-- Year 6: Life Skills, Global Perspectives
UPDATE public.subjects SET teacher_id = 'fca59c55-085d-428e-aec0-b2b1b2c0346c'
WHERE class_id = '765eed4a-7d21-49e1-8ca2-982b13f1b524'
AND name IN ('Life Skills', 'Global Perspectives');
