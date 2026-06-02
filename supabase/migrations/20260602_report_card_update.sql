-- Migration: Report card format update
-- Fixes column mismatch, adds result_type, updates grade scale to school's actual system

-- 1. Add missing columns to results (fixes insert errors)
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS grade_letter VARCHAR(5);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS teacher_comments TEXT;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS head_teacher_comments TEXT;

-- 2. Add result_type to distinguish mid-term vs end-of-term
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS result_type VARCHAR(20) DEFAULT 'end_of_term'
  CHECK (result_type IN ('mid_term', 'end_of_term'));

-- 3. Replace old grade scale with school's actual scale (scores out of 30)
DELETE FROM public.grade_scales;
INSERT INTO public.grade_scales (min_score, max_score, grade_letter, description) VALUES
  (28.5,  30.0,  'A+', 'Outstanding'),
  (27.0,  28.49, 'A',  'Outstanding'),
  (25.5,  26.99, 'B+', 'Proficient'),
  (24.0,  25.49, 'B',  'Proficient'),
  (22.5,  23.99, 'C+', 'Capable'),
  (21.0,  22.49, 'C',  'Capable'),
  (18.0,  20.99, 'D',  'PTE'),
  (0.0,   17.99, 'E',  'NME');
