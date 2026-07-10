-- Fix report_submissions rows that have head_teacher_id = NULL.
-- These were created by the admin "save comment" upsert which doesn't
-- include head_teacher_id, so on INSERT it defaults to NULL.
-- The report_submissions RLS USING clause relies on head_teacher_id matching
-- auth.uid() (condition 2). When it's NULL this condition fails, and the
-- fallback EXISTS subquery can fail in some PostgREST contexts, causing an
-- RLS error when the head teacher tries to submit the report.

UPDATE public.report_submissions rs
SET head_teacher_id = c.head_teacher_id
FROM public.students s
JOIN public.classes c ON c.id = s.class_id
WHERE rs.student_id = s.id
  AND rs.head_teacher_id IS NULL
  AND c.head_teacher_id IS NOT NULL;
