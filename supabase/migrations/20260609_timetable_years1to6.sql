-- Populate timetable for Years 1-6 from the Academic Man Hour Placement PDF
-- Art & Design → Creative Art, NVQ/Non Verbal & Quantitative → Quantitative Reasoning
-- Skips administrative slots: Duty, Prayer, Assembly, Extension for NME, Club Engagement, Meetings

-- Clear existing entries for Years 1-6 only
DELETE FROM public.timetable_entries WHERE class_id IN (
  '158b7a33-4844-4cf9-b999-c21ca495f01c',
  '522b62c0-889c-4ccf-85e5-e30e343fac2c',
  'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03',
  'fe8d2a00-6921-40bc-9759-55bc6ca49eb5',
  '0255c250-f106-42d9-9399-c3da696961a0',
  '765eed4a-7d21-49e1-8ca2-982b13f1b524'
);

INSERT INTO public.timetable_entries (class_id, subject_id, day_of_week, start_time, end_time) VALUES

-- ══ YEAR 1 ══════════════════════════════════════════════════════════════════
-- Monday
('158b7a33-4844-4cf9-b999-c21ca495f01c','fbd35dda-3e5f-4bb0-aaaa-7faa5392e858','Monday','08:20','09:20'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','561689fa-3884-4f4f-9f5c-c7f9430719c6','Monday','09:30','10:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','df5e5cd3-4541-47b7-8800-0e8fda8d31a2','Monday','10:30','11:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','2dc481ae-fae4-4058-bafc-45a98f8f75f0','Monday','12:00','13:00'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','1ba3349b-d2e4-4186-a15e-91039dfc8b7a','Monday','13:00','14:00'),
-- Tuesday
('158b7a33-4844-4cf9-b999-c21ca495f01c','fbd35dda-3e5f-4bb0-aaaa-7faa5392e858','Tuesday','08:20','09:20'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','2fbebc6d-7616-4dda-b7f5-2c1aebe35c04','Tuesday','09:30','10:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','479da028-0538-4e4e-8cce-d86ca52b0abc','Tuesday','10:30','11:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','2dc481ae-fae4-4058-bafc-45a98f8f75f0','Tuesday','12:00','13:00'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','7570ca4f-f9ed-4f4f-a869-7a1b1e8257a2','Tuesday','13:00','14:00'),
-- Wednesday
('158b7a33-4844-4cf9-b999-c21ca495f01c','fbd35dda-3e5f-4bb0-aaaa-7faa5392e858','Wednesday','08:20','09:20'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','d4c9eebd-4d9f-4963-aaf5-e4d315664ceb','Wednesday','09:30','10:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','46733bd2-848e-4e5a-b2bd-d51725fb69fb','Wednesday','10:30','11:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','2dc481ae-fae4-4058-bafc-45a98f8f75f0','Wednesday','12:00','13:00'),
-- Thursday
('158b7a33-4844-4cf9-b999-c21ca495f01c','fbd35dda-3e5f-4bb0-aaaa-7faa5392e858','Thursday','08:20','09:20'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','2fbebc6d-7616-4dda-b7f5-2c1aebe35c04','Thursday','09:30','10:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','2dc481ae-fae4-4058-bafc-45a98f8f75f0','Thursday','10:30','11:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','02f1609a-21ce-4565-9741-8e525179b71d','Thursday','12:00','13:00'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','43c927ba-fec7-4903-b635-d5701d46397d','Thursday','13:00','14:00'),
-- Friday
('158b7a33-4844-4cf9-b999-c21ca495f01c','fbd35dda-3e5f-4bb0-aaaa-7faa5392e858','Friday','08:20','09:20'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','46733bd2-848e-4e5a-b2bd-d51725fb69fb','Friday','09:30','10:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','e74322c2-fd44-46a4-a04d-efd8ce9b569e','Friday','10:30','11:30'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','dc4b2a5e-5f85-48fe-b8cb-0cf268ad37db','Friday','12:00','13:00'),
('158b7a33-4844-4cf9-b999-c21ca495f01c','31e8f69d-8dca-417b-913b-f1eebe336ad6','Friday','13:00','14:00'),

-- ══ YEAR 2 ══════════════════════════════════════════════════════════════════
-- Monday
('522b62c0-889c-4ccf-85e5-e30e343fac2c','790fc232-a5e3-4754-be5f-d68060b2ddeb','Monday','08:20','09:20'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','f4a81908-1f83-40bd-8e23-a703e7956b6a','Monday','09:30','10:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','a318d489-387b-4560-af9a-41f95a258cc1','Monday','10:30','11:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','7270ff01-4afa-4277-ab40-407ebdc1cdbc','Monday','12:00','13:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','e2fcbcf5-081a-4e18-b5e1-8f0840d2d39d','Monday','13:00','14:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','a0e4a6ad-2642-4e42-94e6-6307fc1cce7e','Monday','14:00','14:30'),
-- Tuesday
('522b62c0-889c-4ccf-85e5-e30e343fac2c','790fc232-a5e3-4754-be5f-d68060b2ddeb','Tuesday','08:20','09:20'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','96395506-780e-4fdc-bd2f-3a0f67e87059','Tuesday','09:30','10:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','af8ce904-f34a-49e1-91fd-c4ccff8b61a6','Tuesday','10:30','11:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','7270ff01-4afa-4277-ab40-407ebdc1cdbc','Tuesday','12:00','13:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','27846afb-fab2-4e71-9ba6-e0769a68cd1c','Tuesday','13:00','14:00'),
-- Wednesday (10:30-11:30 is Extension for NME — skipped)
('522b62c0-889c-4ccf-85e5-e30e343fac2c','790fc232-a5e3-4754-be5f-d68060b2ddeb','Wednesday','08:20','09:20'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','1792a009-e4e7-4d21-8068-8e88784c3265','Wednesday','09:30','10:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','d539a332-960d-46b4-b375-c72793bf17a2','Wednesday','12:00','13:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','7270ff01-4afa-4277-ab40-407ebdc1cdbc','Wednesday','13:00','14:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','c86e51d2-734c-4bbb-8f25-d078d7912488','Wednesday','14:00','14:30'),
-- Thursday
('522b62c0-889c-4ccf-85e5-e30e343fac2c','790fc232-a5e3-4754-be5f-d68060b2ddeb','Thursday','08:20','09:20'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','96395506-780e-4fdc-bd2f-3a0f67e87059','Thursday','09:30','10:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','6e59a89a-8f02-480e-bafd-dc96ae6d111d','Thursday','10:30','11:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','7270ff01-4afa-4277-ab40-407ebdc1cdbc','Thursday','12:00','13:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','c9605659-eb7c-4297-9b1d-29f1bb726b7d','Thursday','13:00','14:00'),
-- Friday
('522b62c0-889c-4ccf-85e5-e30e343fac2c','790fc232-a5e3-4754-be5f-d68060b2ddeb','Friday','08:20','09:20'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','1792a009-e4e7-4d21-8068-8e88784c3265','Friday','09:30','10:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','5712448d-a591-462f-ae67-b4ac1a041e1b','Friday','10:30','11:30'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','7270ff01-4afa-4277-ab40-407ebdc1cdbc','Friday','12:00','13:00'),
('522b62c0-889c-4ccf-85e5-e30e343fac2c','8348f656-16d1-4ac4-9900-48ab59f88d4b','Friday','13:00','14:00'),

-- ══ YEAR 3 ══════════════════════════════════════════════════════════════════
-- Monday
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','e1b6179c-f845-49d5-b313-acbc04a52ed6','Monday','08:20','09:20'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','d8349e69-5ea9-4de0-9c44-338c221828a6','Monday','09:30','10:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','8564df84-f428-46f7-bc04-c00e4aaab596','Monday','10:30','11:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','113d08bb-9d5a-4593-818a-1b9fe96cc8ca','Monday','12:00','13:00'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','ad9d83b0-c324-42d4-8cdf-3b0b09334239','Monday','13:00','14:00'),
-- Tuesday
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','113d08bb-9d5a-4593-818a-1b9fe96cc8ca','Tuesday','08:20','09:20'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','e1b6179c-f845-49d5-b313-acbc04a52ed6','Tuesday','09:30','10:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','91eac62a-8778-45da-9d10-c541e26f9959','Tuesday','10:30','11:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','02d1cbae-b1ab-4527-bf89-783210420283','Tuesday','12:00','13:00'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','b831ae6b-c7b3-4d71-947a-e5a0fc15d497','Tuesday','13:00','14:00'),
-- Wednesday
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','8564df84-f428-46f7-bc04-c00e4aaab596','Wednesday','08:20','09:20'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','113d08bb-9d5a-4593-818a-1b9fe96cc8ca','Wednesday','09:30','10:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','e1b6179c-f845-49d5-b313-acbc04a52ed6','Wednesday','10:30','11:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','267a5019-838e-4692-915c-55ebbaf5ad74','Wednesday','12:00','13:00'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','ef17718f-311c-4f93-a223-49e59e58566b','Wednesday','13:00','14:00'),
-- Thursday
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','02d1cbae-b1ab-4527-bf89-783210420283','Thursday','08:20','09:20'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','f55f3850-7ea7-4764-b2c4-4c0fc2bb1f88','Thursday','09:30','10:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','113d08bb-9d5a-4593-818a-1b9fe96cc8ca','Thursday','10:30','11:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','e1b6179c-f845-49d5-b313-acbc04a52ed6','Thursday','12:00','13:00'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','b831ae6b-c7b3-4d71-947a-e5a0fc15d497','Thursday','13:00','14:00'),
-- Friday
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','4277dcb3-bf11-4a3d-961a-5d1b08c099e1','Friday','08:20','09:20'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','3a982427-c13d-4743-aa63-2275ce869583','Friday','09:30','10:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','fb96243e-dbcd-4448-adab-e062ca2684de','Friday','10:30','11:30'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','0cd7f70d-1182-4e1a-9101-b181937fbb14','Friday','12:00','13:00'),
('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03','c4718b35-95c7-4d3c-80b4-6f2e73edf088','Friday','13:00','14:00'),

-- ══ YEAR 4 ══════════════════════════════════════════════════════════════════
-- Monday
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','d568d276-a593-430d-b85f-62ef5817e53b','Monday','08:20','09:20'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','485fa98b-c060-4e60-aa47-6d52f00f35e3','Monday','09:30','10:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','e6fcfef8-5514-4a93-8cb1-4e36e27ad144','Monday','10:30','11:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','0160eb8a-d55c-4bfe-ba0e-c62b5e7f7ee5','Monday','12:00','13:00'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','06976135-a066-4f34-b593-f844c407cda2','Monday','13:00','14:00'),
-- Tuesday
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','1e858aca-d50d-4700-a25f-eb949f2a280a','Tuesday','08:20','09:20'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','d568d276-a593-430d-b85f-62ef5817e53b','Tuesday','09:30','10:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','485fa98b-c060-4e60-aa47-6d52f00f35e3','Tuesday','10:30','11:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','d653d81c-3435-47ba-a949-e8cd7f0b6e86','Tuesday','12:00','13:00'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','3c50aafb-2e38-4dd5-8592-5c2de4ce7979','Tuesday','13:00','14:00'),
-- Wednesday
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','e1eed24e-e108-4b51-9a27-671b2797b876','Wednesday','08:20','09:20'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','0160eb8a-d55c-4bfe-ba0e-c62b5e7f7ee5','Wednesday','09:30','10:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','d568d276-a593-430d-b85f-62ef5817e53b','Wednesday','10:30','11:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','485fa98b-c060-4e60-aa47-6d52f00f35e3','Wednesday','12:00','13:00'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','51ff6119-cc0f-4ec9-acf8-5ef6613d214f','Wednesday','13:00','14:00'),
-- Thursday
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','485fa98b-c060-4e60-aa47-6d52f00f35e3','Thursday','08:20','09:20'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','1e858aca-d50d-4700-a25f-eb949f2a280a','Thursday','09:30','10:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','6f97f65d-c23b-4833-b272-3ad4de8b0d8c','Thursday','10:30','11:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','d568d276-a593-430d-b85f-62ef5817e53b','Thursday','12:00','13:00'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','70d5c4bc-0549-4a49-8d8d-52f79795b54e','Thursday','13:00','14:00'),
-- Friday
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','d8f1bea7-41b7-407e-a7d5-7f65ad8e5ace','Friday','08:20','09:20'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','68d09ce8-15b0-4f9f-ad0b-792223d975e2','Friday','09:30','10:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','6ebf1f2c-6785-4f2f-ad38-d7b1882cab25','Friday','10:30','11:30'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','3af989ea-3045-4dc1-bc71-5632a0be1e17','Friday','12:00','13:00'),
('fe8d2a00-6921-40bc-9759-55bc6ca49eb5','3c50aafb-2e38-4dd5-8592-5c2de4ce7979','Friday','13:00','14:00'),

-- ══ YEAR 5 ══════════════════════════════════════════════════════════════════
-- Monday
('0255c250-f106-42d9-9399-c3da696961a0','dbfb427f-7e80-483f-8b00-a60651dac39b','Monday','08:20','09:20'),
('0255c250-f106-42d9-9399-c3da696961a0','479655b9-cd2f-4076-81c9-df43ad17e49e','Monday','09:30','10:30'),
('0255c250-f106-42d9-9399-c3da696961a0','35046a34-9193-467f-9775-4d7b082705dd','Monday','10:30','11:30'),
('0255c250-f106-42d9-9399-c3da696961a0','34f16ea5-216a-4ab6-b08c-9ce32ad35ced','Monday','12:00','13:00'),
('0255c250-f106-42d9-9399-c3da696961a0','198da1c4-2202-4ce7-9729-25836a15b572','Monday','13:00','14:00'),
-- Tuesday
('0255c250-f106-42d9-9399-c3da696961a0','37c0e67d-591b-42e5-9f3a-4445f16270b4','Tuesday','08:20','09:20'),
('0255c250-f106-42d9-9399-c3da696961a0','4f2f18e3-5105-47c9-a87b-a0a778081845','Tuesday','09:30','10:30'),
('0255c250-f106-42d9-9399-c3da696961a0','479655b9-cd2f-4076-81c9-df43ad17e49e','Tuesday','10:30','11:30'),
('0255c250-f106-42d9-9399-c3da696961a0','35046a34-9193-467f-9775-4d7b082705dd','Tuesday','12:00','13:00'),
('0255c250-f106-42d9-9399-c3da696961a0','90d88897-3cd8-4bb1-9fba-f333ac2dad75','Tuesday','13:00','14:00'),
-- Wednesday
('0255c250-f106-42d9-9399-c3da696961a0','35046a34-9193-467f-9775-4d7b082705dd','Wednesday','08:20','09:20'),
('0255c250-f106-42d9-9399-c3da696961a0','50691907-b7f5-4129-82b2-e2cb7394aa3c','Wednesday','09:30','10:30'),
('0255c250-f106-42d9-9399-c3da696961a0','dbfb427f-7e80-483f-8b00-a60651dac39b','Wednesday','10:30','11:30'),
('0255c250-f106-42d9-9399-c3da696961a0','479655b9-cd2f-4076-81c9-df43ad17e49e','Wednesday','12:00','13:00'),
('0255c250-f106-42d9-9399-c3da696961a0','b48d801d-bf1b-4c60-9e7f-a6e8bab2cd20','Wednesday','13:00','14:00'),
-- Thursday
('0255c250-f106-42d9-9399-c3da696961a0','479655b9-cd2f-4076-81c9-df43ad17e49e','Thursday','08:20','09:20'),
('0255c250-f106-42d9-9399-c3da696961a0','35046a34-9193-467f-9775-4d7b082705dd','Thursday','09:30','10:30'),
('0255c250-f106-42d9-9399-c3da696961a0','4f2f18e3-5105-47c9-a87b-a0a778081845','Thursday','10:30','11:30'),
('0255c250-f106-42d9-9399-c3da696961a0','6b34043c-48d5-4450-a4e6-463c1485ba73','Thursday','12:00','13:00'),
('0255c250-f106-42d9-9399-c3da696961a0','68d7e514-9f9e-46ff-9d3f-211b1c3c948c','Thursday','13:00','14:00'),
-- Friday
('0255c250-f106-42d9-9399-c3da696961a0','3fbfbfeb-b347-493b-827e-2793ba3920fd','Friday','08:20','09:20'),
('0255c250-f106-42d9-9399-c3da696961a0','339ac64d-c085-4c59-8d06-1d5cfcd05416','Friday','09:30','10:30'),
('0255c250-f106-42d9-9399-c3da696961a0','6eea1949-c268-4d21-ae22-3081c7ee3703','Friday','10:30','11:30'),
('0255c250-f106-42d9-9399-c3da696961a0','9a1bef35-300c-414a-9c46-812405f20f5a','Friday','12:00','13:00'),
('0255c250-f106-42d9-9399-c3da696961a0','f301d929-5696-4a7e-8f8a-b16166bb1367','Friday','13:00','14:00'),

-- ══ YEAR 6 ══════════════════════════════════════════════════════════════════
-- Monday
('765eed4a-7d21-49e1-8ca2-982b13f1b524','678edc9b-c041-49f4-9cf4-f364b63afb1c','Monday','08:20','09:20'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','a7a297dd-47bd-4335-a40c-f79d429bb6bb','Monday','09:30','10:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','87b1fb3a-1f53-4746-97b3-dedf8e2c67f4','Monday','10:30','11:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','67a66bcb-75ae-4eef-9f12-b9d4e0cea8cc','Monday','12:00','13:00'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','d0c9b199-472c-407a-93c7-538686301e17','Monday','13:00','14:00'),
-- Tuesday
('765eed4a-7d21-49e1-8ca2-982b13f1b524','67a66bcb-75ae-4eef-9f12-b9d4e0cea8cc','Tuesday','08:20','09:20'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','5c06ae7f-08ad-4843-b577-272e936ac754','Tuesday','09:30','10:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','fdbb7adb-e3c8-42cb-9cbb-61f74f2db345','Tuesday','10:30','11:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','87b1fb3a-1f53-4746-97b3-dedf8e2c67f4','Tuesday','12:00','13:00'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','6ed21728-648d-4184-8973-a099a9065beb','Tuesday','13:00','14:00'),
-- Wednesday
('765eed4a-7d21-49e1-8ca2-982b13f1b524','87b1fb3a-1f53-4746-97b3-dedf8e2c67f4','Wednesday','08:20','09:20'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','67a66bcb-75ae-4eef-9f12-b9d4e0cea8cc','Wednesday','09:30','10:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','0ef859ca-c096-4faa-b963-d40518c28e69','Wednesday','10:30','11:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','a7a297dd-47bd-4335-a40c-f79d429bb6bb','Wednesday','12:00','13:00'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','ebeb0550-31a6-472d-8832-855c3b4e5c11','Wednesday','13:00','14:00'),
-- Thursday
('765eed4a-7d21-49e1-8ca2-982b13f1b524','f25884bb-a091-4c5b-a96f-a3dbaaf56719','Thursday','08:20','09:20'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','87b1fb3a-1f53-4746-97b3-dedf8e2c67f4','Thursday','09:30','10:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','67a66bcb-75ae-4eef-9f12-b9d4e0cea8cc','Thursday','10:30','11:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','fdbb7adb-e3c8-42cb-9cbb-61f74f2db345','Thursday','12:00','13:00'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','2f8bfb31-48f5-4f32-8bfb-9c4735f03fed','Thursday','13:00','14:00'),
-- Friday
('765eed4a-7d21-49e1-8ca2-982b13f1b524','02cd9212-31e4-4d2f-946f-de9fa1a674c5','Friday','08:20','09:20'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','6ed21728-648d-4184-8973-a099a9065beb','Friday','09:30','10:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','4092f72f-6e45-4b20-bd72-e41dd473d792','Friday','10:30','11:30'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','23f7b45e-8b0d-4e10-a42c-bfcafbee2348','Friday','12:00','13:00'),
('765eed4a-7d21-49e1-8ca2-982b13f1b524','a87469d8-56d8-4c0a-8bdc-70e3ac2dde95','Friday','13:00','14:00');
