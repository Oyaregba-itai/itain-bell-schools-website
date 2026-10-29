-- Include the Early Years progression in year-end promotion:
-- EXPLORERS -> MAGNIFICENT -> DISCOVERERS -> NOBLE -> YEAR 1.
-- Also repairs the already-completed 2025/2026 run, excluding pupils enrolled after that run.

CREATE OR REPLACE FUNCTION public.next_school_class_name(class_name text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE upper(trim(class_name))
    WHEN 'EXPLORERS' THEN 'MAGNIFICENT'
    WHEN 'MAGNIFICENT' THEN 'DISCOVERERS'
    WHEN 'DISCOVERERS' THEN 'NOBLE'
    WHEN 'NOBLE' THEN 'YEAR 1'
    ELSE CASE
      WHEN public.primary_year_number(class_name) BETWEEN 1 AND 5
        THEN 'YEAR ' || (public.primary_year_number(class_name) + 1)::text
      ELSE NULL
    END
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
    WHERE upper(trim(c2.name)) = public.next_school_class_name(c.name)
    ORDER BY c2.name
    LIMIT 1
  ) next_class ON public.next_school_class_name(c.name) IS NOT NULL
  WHERE s.enrollment_status = 'active'
    AND (
      upper(trim(c.name)) IN ('EXPLORERS', 'MAGNIFICENT', 'DISCOVERERS', 'NOBLE')
      OR public.primary_year_number(c.name) BETWEEN 1 AND 6
    )
  ORDER BY CASE upper(trim(c.name))
      WHEN 'EXPLORERS' THEN 0 WHEN 'MAGNIFICENT' THEN 1
      WHEN 'DISCOVERERS' THEN 2 WHEN 'NOBLE' THEN 3
      ELSE 3 + public.primary_year_number(c.name)
    END,
    s.full_name;
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
  IF EXISTS (SELECT 1 FROM public.report_submissions WHERE term_id = p_term_id AND status = 'submitted') THEN
    RAISE EXCEPTION 'All submitted Trinity Term report cards must be approved first';
  END IF;

  PERFORM s.id FROM public.students s JOIN public.classes c ON c.id=s.class_id
   WHERE s.enrollment_status='active'
     AND (upper(trim(c.name)) IN ('EXPLORERS','MAGNIFICENT','DISCOVERERS','NOBLE')
          OR public.primary_year_number(c.name) BETWEEN 1 AND 6)
   FOR UPDATE OF s;
  IF EXISTS (
    SELECT 1 FROM public.preview_year_end_promotion(p_term_id) p
    WHERE p.proposed_action='promoted' AND p.to_class_id IS NULL
  ) THEN RAISE EXCEPTION 'A destination class is missing. Check the Early Years and Year 1 through Year 6 classes.'; END IF;

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
      UPDATE public.students SET enrollment_status='alumni',class_id=NULL WHERE id=v_row.student_id;
      v_graduated := v_graduated + 1;
    ELSE
      UPDATE public.students SET class_id=v_row.to_class_id WHERE id=v_row.student_id;
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

REVOKE ALL ON FUNCTION public.next_school_class_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_year_end_promotion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_year_end_promotion(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_school_class_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_year_end_promotion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_year_end_promotion(uuid,text) TO authenticated;

-- Repair any completed run that omitted Early Years. The creation-time cutoff protects
-- pupils enrolled after the promotion was performed from being moved.
DO $$
DECLARE
  v_run public.promotion_runs%ROWTYPE;
  v_row record;
BEGIN
  FOR v_run IN SELECT * FROM public.promotion_runs LOOP
    FOR v_row IN
      SELECT s.id AS student_id, c.id AS from_class_id, destination.id AS to_class_id
      FROM public.students s
      JOIN public.classes c ON c.id = s.class_id
      JOIN public.classes destination
        ON upper(trim(destination.name)) = public.next_school_class_name(c.name)
      WHERE s.enrollment_status = 'active'
        AND upper(trim(c.name)) IN ('EXPLORERS','MAGNIFICENT','DISCOVERERS','NOBLE')
        AND s.created_at <= v_run.performed_at
        AND NOT EXISTS (
          SELECT 1 FROM public.promotion_records pr
          WHERE pr.run_id = v_run.id AND pr.student_id = s.id
        )
      FOR UPDATE OF s
    LOOP
      INSERT INTO public.student_enrollments(student_id,class_id,academic_year,status,ended_at)
      VALUES(v_row.student_id,v_row.from_class_id,v_run.academic_year,'completed',v_run.performed_at)
      ON CONFLICT(student_id,academic_year) DO UPDATE
        SET class_id=excluded.class_id,status='completed',ended_at=excluded.ended_at;

      INSERT INTO public.promotion_records(run_id,student_id,from_class_id,to_class_id,action)
      VALUES(v_run.id,v_row.student_id,v_row.from_class_id,v_row.to_class_id,'promoted');

      UPDATE public.students SET class_id=v_row.to_class_id WHERE id=v_row.student_id;

      INSERT INTO public.student_enrollments(student_id,class_id,academic_year,status)
      VALUES(v_row.student_id,v_row.to_class_id,v_run.next_academic_year,'current')
      ON CONFLICT(student_id,academic_year) DO UPDATE
        SET class_id=excluded.class_id,status='current',ended_at=NULL;
    END LOOP;

    UPDATE public.promotion_runs pr
    SET promoted_count = (
      SELECT count(*) FROM public.promotion_records rec
      WHERE rec.run_id = pr.id AND rec.action = 'promoted'
    ),
    graduated_count = (
      SELECT count(*) FROM public.promotion_records rec
      WHERE rec.run_id = pr.id AND rec.action = 'graduated'
    )
    WHERE pr.id = v_run.id;
  END LOOP;
END;
$$;
