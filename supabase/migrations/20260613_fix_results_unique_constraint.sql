-- The unique constraint on results was missing result_type, so a student
-- could only ever have one result row per (student, subject, term) total —
-- whichever of Mid Term / End of Term was saved first. Saving the other
-- type then silently failed with a unique-violation error.

ALTER TABLE public.results
  DROP CONSTRAINT results_student_id_subject_id_term_id_key;

ALTER TABLE public.results
  ADD CONSTRAINT results_student_id_subject_id_term_id_result_type_key
  UNIQUE (student_id, subject_id, term_id, result_type);
