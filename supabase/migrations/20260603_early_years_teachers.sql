-- Remove Music from Magnificent and Year 1-6 (only Discoverers & Noble do Music)
DELETE FROM public.subjects
WHERE name = 'Music' AND class_id IN (
  '4fe83128-6e01-4c67-a2a0-087722e6de8d',  -- Magnificent
  '158b7a33-4844-4cf9-b999-c21ca495f01c',  -- Year 1
  '522b62c0-889c-4ccf-85e5-e30e343fac2c',  -- Year 2
  'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03',  -- Year 3
  'fe8d2a00-6921-40bc-9759-55bc6ca49eb5',  -- Year 4
  '0255c250-f106-42d9-9399-c3da696961a0',  -- Year 5
  '765eed4a-7d21-49e1-8ca2-982b13f1b524'   -- Year 6
);

-- Add Music for Discoverers (Mr Segun Adedunye - not assessed, he is head of class)
INSERT INTO public.subjects (name, class_id, teacher_id) VALUES
('Music', 'e44ade7a-596b-4711-8dcc-41c0b8224450', '182ee4c8-c25b-4b7a-90d5-cbc94e26c322');

-- Assign class teachers to Early Years subjects
-- EXPLORERS: Mrs Blessing Ayodele teaches all subjects
UPDATE public.subjects SET teacher_id = 'cf606ff2-6024-4c7f-b6b5-2731da53ded9'
WHERE class_id = 'b75d0163-852b-4e23-b3d5-3196dc2cd241';

-- MAGNIFICENT: Mrs Egele Olubunmi teaches all subjects
UPDATE public.subjects SET teacher_id = '85ece953-0629-40bc-9e2c-f4cbad8fddf6'
WHERE class_id = '4fe83128-6e01-4c67-a2a0-087722e6de8d';

-- DISCOVERERS: Mrs Balogun Wuraola teaches all except Music (Mr Segun)
UPDATE public.subjects SET teacher_id = 'db46c1a4-f1bb-4c7b-8d2b-058df54d5824'
WHERE class_id = 'e44ade7a-596b-4711-8dcc-41c0b8224450' AND name != 'Music';

-- NOBLE: Mrs Yetunde Bakare teaches all except French (Mr Nicolas) and Music (Mr Segun)
UPDATE public.subjects SET teacher_id = '716eb1f2-557d-4f40-ac50-d5ab7fd3c9cf'
WHERE class_id = '159f91be-a301-417e-97f2-97a0b762f2e6' AND name NOT IN ('French', 'Music');

UPDATE public.subjects SET teacher_id = 'ebadf161-0032-4a40-ad02-d4a66bfa3a11'
WHERE class_id = '159f91be-a301-417e-97f2-97a0b762f2e6' AND name = 'French';

UPDATE public.subjects SET teacher_id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322'
WHERE class_id = '159f91be-a301-417e-97f2-97a0b762f2e6' AND name = 'Music';
