-- Safe year-end promotion and alumni history.
-- Promotions are prepared from a Trinity Term and executed once per academic year.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS enrollment_status text NOT NULL DEFAULT 'active';

DO $$ BEGIN
  ALTER TABLE public.students ADD CONSTRAINT students_enrollment_status_check
    CHECK (enrollment_status IN ('active', 'alumni', 'withdrawn'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  academic_year text NOT NULL,
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'completed', 'repeated', 'graduated', 'withdrawn')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year)
);

CREATE TABLE IF NOT EXISTS public.promotion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL UNIQUE,
  next_academic_year text NOT NULL,
  trinity_term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  promoted_count integer NOT NULL DEFAULT 0,
  graduated_count integer NOT NULL DEFAULT 0,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotion_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.promotion_runs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  from_class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  to_class_id uuid REFERENCES public.classes(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('promoted', 'graduated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.alumni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE RESTRICT,
  graduation_academic_year text NOT NULL,
  final_class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  graduated_at timestamptz NOT NULL DEFAULT now(),
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_lookup ON public.student_enrollments(student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_year ON public.student_enrollments(class_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON public.alumni(graduation_academic_year);

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage student enrolments" ON public.student_enrollments;
CREATE POLICY "Admins manage student enrolments" ON public.student_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authenticated users read student enrolments" ON public.student_enrollments;
CREATE POLICY "Authenticated users read student enrolments" ON public.student_enrollments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage promotion runs" ON public.promotion_runs;
CREATE POLICY "Admins manage promotion runs" ON public.promotion_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage promotion records" ON public.promotion_records;
CREATE POLICY "Admins manage promotion records" ON public.promotion_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage alumni" ON public.alumni;
CREATE POLICY "Admins manage alumni" ON public.alumni FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authenticated users read alumni" ON public.alumni;
CREATE POLICY "Authenticated users read alumni" ON public.alumni FOR SELECT TO authenticated USING (true);

-- Convert a class label such as "YEAR 3" or "Year 3 Blue" to its year number.
CREATE OR REPLACE FUNCTION public.primary_year_number(class_name text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN upper(class_name) ~ '\mYEAR\s*[1-6]\M'
      THEN substring(upper(class_name) from '\mYEAR\s*([1-6])\M')::integer
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.preview_year_end_promotion(p_term_id uuid)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  admission_number text,
  from_class_id uuid,
  from_class_name text,
  to_class_id uuid,
  to_class_name text,
  proposed_action text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_term public.terms%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_term FROM public.terms WHERE id = p_term_id;
  IF NOT FOUND OR lower(v_term.name) <> 'trinity term' THEN
    RAISE EXCEPTION 'Select a Trinity Term';
  END IF;

  RETURN QUERY
  SELECT s.id, s.full_name, s.admission_number, c.id, c.name,
         next_class.id, next_class.name,
         CASE WHEN public.primary_year_number(c.name) = 6 THEN 'graduated' ELSE 'promoted' END
  FROM public.students s
  JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN LATERAL (
    SELECT c2.id, c2.name
    FROM public.classes c2
    WHERE public.primary_year_number(c2.name) = public.primary_year_number(c.name) + 1
    ORDER BY CASE WHEN lower(c2.name) = lower(regexp_replace(c.name, '(?i)year\s*[1-6]', 'YEAR ' || (public.primary_year_number(c.name) + 1)::text)) THEN 0 ELSE 1 END,
             c2.name
    LIMIT 1
  ) next_class ON public.primary_year_number(c.name) BETWEEN 1 AND 5
  WHERE s.enrollment_status = 'active'
    AND public.primary_year_number(c.name) BETWEEN 1 AND 6
  ORDER BY public.primary_year_number(c.name), s.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_year_end_promotion(p_term_id uuid, p_next_academic_year text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_term public.terms%ROWTYPE;
  v_run_id uuid;
  v_row record;
  v_promoted integer := 0;
  v_graduated integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF trim(coalesce(p_next_academic_year, '')) !~ '^20[0-9]{2}/20[0-9]{2}$' THEN
    RAISE EXCEPTION 'Next academic year must look like 2026/2027';
  END IF;
  SELECT * INTO v_term FROM public.terms WHERE id = p_term_id FOR UPDATE;
  IF NOT FOUND OR lower(v_term.name) <> 'trinity term' THEN RAISE EXCEPTION 'Select a Trinity Term'; END IF;
  IF EXISTS (SELECT 1 FROM public.promotion_runs WHERE academic_year = v_term.academic_year) THEN
    RAISE EXCEPTION 'Students have already been promoted for %', v_term.academic_year;
  END IF;
  IF EXISTS (SELECT 1 FROM public.report_submissions WHERE term_id = p_term_id AND status <> 'approved') THEN
    RAISE EXCEPTION 'All submitted Trinity Term report cards must be approved first';
  END IF;

  -- Lock eligible pupils and ensure every Year 1-5 pupil has a destination.
  PERFORM s.id FROM public.students s JOIN public.classes c ON c.id=s.class_id
   WHERE s.enrollment_status='active' AND public.primary_year_number(c.name) BETWEEN 1 AND 6 FOR UPDATE OF s;
  IF EXISTS (
    SELECT 1 FROM public.preview_year_end_promotion(p_term_id) p
    WHERE p.proposed_action='promoted' AND p.to_class_id IS NULL
  ) THEN RAISE EXCEPTION 'A destination class is missing. Ensure Year 2 through Year 6 classes exist.'; END IF;

  INSERT INTO public.promotion_runs(academic_year,next_academic_year,trinity_term_id,performed_by)
  VALUES(v_term.academic_year,trim(p_next_academic_year),p_term_id,auth.uid()) RETURNING id INTO v_run_id;

  FOR v_row IN SELECT * FROM public.preview_year_end_promotion(p_term_id) LOOP
    INSERT INTO public.student_enrollments(student_id,class_id,academic_year,status,ended_at)
    VALUES(v_row.student_id,v_row.from_class_id,v_term.academic_year,
           CASE WHEN v_row.proposed_action='graduated' THEN 'graduated' ELSE 'completed' END,now())
    ON CONFLICT(student_id,academic_year) DO UPDATE SET class_id=excluded.class_id,status=excluded.status,ended_at=excluded.ended_at;

    INSERT INTO public.promotion_records(run_id,student_id,from_class_id,to_class_id,action)
    VALUES(v_run_id,v_row.student_id,v_row.from_class_id,v_row.to_class_id,v_row.proposed_action);

    IF v_row.proposed_action='graduated' THEN
      INSERT INTO public.alumni(student_id,graduation_academic_year,final_class_id,profile_snapshot,created_by)
      SELECT s.id,v_term.academic_year,v_row.from_class_id,
             jsonb_build_object('full_name',s.full_name,'first_name',s.first_name,'last_name',s.last_name,
               'student_id',s.student_id,'admission_number',s.admission_number,'date_of_birth',s.date_of_birth,
               'gender',s.gender,'school_section',s.school_section,'avatar_url',s.avatar_url),auth.uid()
      FROM public.students s WHERE s.id=v_row.student_id
      ON CONFLICT(student_id) DO NOTHING;
      UPDATE public.students SET enrollment_status='alumni',class_id=NULL,updated_at=now() WHERE id=v_row.student_id;
      v_graduated := v_graduated + 1;
    ELSE
      UPDATE public.students SET class_id=v_row.to_class_id,updated_at=now() WHERE id=v_row.student_id;
      INSERT INTO public.student_enrollments(student_id,class_id,academic_year,status)
      VALUES(v_row.student_id,v_row.to_class_id,trim(p_next_academic_year),'current')
      ON CONFLICT(student_id,academic_year) DO UPDATE SET class_id=excluded.class_id,status='current',ended_at=NULL;
      v_promoted := v_promoted + 1;
    END IF;
  END LOOP;

  UPDATE public.terms SET is_active=false WHERE academic_year=v_term.academic_year;
  INSERT INTO public.terms(name,academic_year,is_active)
  SELECT 'Christmas Term',trim(p_next_academic_year),true
  WHERE NOT EXISTS (SELECT 1 FROM public.terms WHERE name='Christmas Term' AND academic_year=trim(p_next_academic_year));
  UPDATE public.promotion_runs SET promoted_count=v_promoted,graduated_count=v_graduated WHERE id=v_run_id;

  RETURN jsonb_build_object('run_id',v_run_id,'promoted',v_promoted,'graduated',v_graduated);
END;
$$;

REVOKE ALL ON FUNCTION public.preview_year_end_promotion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_year_end_promotion(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_year_end_promotion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_year_end_promotion(uuid,text) TO authenticated;
