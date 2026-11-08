-- Mid-term results are graded out of 30. Normalize legacy percentage-style
-- values before enforcing the scale for future edits.
UPDATE public.results
SET total_score = ROUND((total_score / 100.0) * 30.0, 2)
WHERE result_type = 'mid_term'
  AND total_score > 30
  AND total_score <= 100;

UPDATE public.results
SET grade_letter = CASE
  WHEN total_score >= 28.5 THEN 'A+'
  WHEN total_score >= 27.0 THEN 'A'
  WHEN total_score >= 25.5 THEN 'B+'
  WHEN total_score >= 24.0 THEN 'B'
  WHEN total_score >= 22.5 THEN 'C+'
  WHEN total_score >= 21.0 THEN 'C'
  WHEN total_score >= 18.0 THEN 'D'
  ELSE 'E'
END
WHERE result_type = 'mid_term'
  AND total_score IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.results
    ADD CONSTRAINT results_mid_term_score_max
    CHECK (result_type <> 'mid_term' OR total_score IS NULL OR total_score <= 30);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
