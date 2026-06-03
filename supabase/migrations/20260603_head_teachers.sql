ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS head_teacher_id UUID REFERENCES auth.users(id);

-- Key Stage
UPDATE public.classes SET head_teacher_id = '21447616-91b9-41cc-af08-983589fed8ca' WHERE id = '158b7a33-4844-4cf9-b999-c21ca495f01c'; -- Year 1 - Mrs Ojekunle
UPDATE public.classes SET head_teacher_id = 'a0294012-e1b1-4716-956c-acba4b620a6f' WHERE id = '522b62c0-889c-4ccf-85e5-e30e343fac2c'; -- Year 2 - Mrs Kushoro
UPDATE public.classes SET head_teacher_id = '2a7859a4-b1b2-42b3-bfbd-205b1b11f424' WHERE id = 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03'; -- Year 3 - Miss Elizabeth Adigwe
UPDATE public.classes SET head_teacher_id = 'fca59c55-085d-428e-aec0-b2b1b2c0346c' WHERE id = 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5'; -- Year 4 - Miss Temitope Olawunmi
UPDATE public.classes SET head_teacher_id = '9570c3f1-a047-49b5-a18d-f2f6bf053b83' WHERE id = '0255c250-f106-42d9-9399-c3da696961a0'; -- Year 5 - Miss Kehinde Ademoyegun
UPDATE public.classes SET head_teacher_id = '30fa69a6-a918-4b75-a362-6f32b108ec44' WHERE id = '765eed4a-7d21-49e1-8ca2-982b13f1b524'; -- Year 6 - Mrs Ronke Oloje

-- Early Years
UPDATE public.classes SET head_teacher_id = 'cf606ff2-6024-4c7f-b6b5-2731da53ded9' WHERE id = 'b75d0163-852b-4e23-b3d5-3196dc2cd241'; -- Explorers - Mrs Ayodele
UPDATE public.classes SET head_teacher_id = '85ece953-0629-40bc-9e2c-f4cbad8fddf6' WHERE id = '4fe83128-6e01-4c67-a2a0-087722e6de8d'; -- Magnificent - Mrs Egele
UPDATE public.classes SET head_teacher_id = 'db46c1a4-f1bb-4c7b-8d2b-058df54d5824' WHERE id = 'e44ade7a-596b-4711-8dcc-41c0b8224450'; -- Discoverers - Mrs Balogun
UPDATE public.classes SET head_teacher_id = '716eb1f2-557d-4f40-ac50-d5ab7fd3c9cf' WHERE id = '159f91be-a301-417e-97f2-97a0b762f2e6'; -- Noble - Mrs Bakare
