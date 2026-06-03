-- Insert all 18 subjects for each Key Stage class (Year 1-6)
-- Skips any subject already assigned to a class (preserves existing teacher assignments)

INSERT INTO public.subjects (name, class_id)
SELECT s.name, c.class_id::uuid
FROM (VALUES
  ('Mathematics'), ('English Language'), ('Science'), ('Humanities'), ('Yoruba'),
  ('Creative Art'), ('CRK'), ('Computing'), ('Vocational Education'), ('French'),
  ('Global Perspectives'), ('Verbal Reasoning'), ('STEAM'), ('Diction'),
  ('Quantitative Reasoning'), ('Life Skills'), ('Music'), ('PHE')
) AS s(name)
CROSS JOIN (VALUES
  ('158b7a33-4844-4cf9-b999-c21ca495f01c'),
  ('522b62c0-889c-4ccf-85e5-e30e343fac2c'),
  ('d99f8cc8-a4f9-4c80-ac9d-9ba6434acc03'),
  ('fe8d2a00-6921-40bc-9759-55bc6ca49eb5'),
  ('0255c250-f106-42d9-9399-c3da696961a0'),
  ('765eed4a-7d21-49e1-8ca2-982b13f1b524')
) AS c(class_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects sub
  WHERE sub.name = s.name AND sub.class_id = c.class_id::uuid
);
