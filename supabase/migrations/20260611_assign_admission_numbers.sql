-- Backfill admission_number / student_id for all existing students.
-- Both fields share the same value: IBS/2025/0001 (sequential), ordered by
-- school section (creche -> nursery -> primary), then class name, then student name.

WITH ordered AS (
  SELECT
    s.id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE s.school_section
          WHEN 'creche' THEN 1
          WHEN 'nursery' THEN 2
          WHEN 'primary' THEN 3
          ELSE 4
        END,
        c.name,
        s.full_name
    ) AS rn
  FROM public.students s
  LEFT JOIN public.classes c ON c.id = s.class_id
)
UPDATE public.students s
SET
  admission_number = 'IBS/2025/' || lpad(o.rn::text, 4, '0'),
  student_id = 'IBS/2025/' || lpad(o.rn::text, 4, '0')
FROM ordered o
WHERE o.id = s.id;
