-- PostgreSQL requires exact return types for table-returning functions.
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
  SELECT s.id,
         s.full_name::text,
         s.admission_number::text,
         c.id,
         c.name::text,
         next_class.id,
         next_class.name::text,
         (CASE WHEN public.primary_year_number(c.name) = 6 THEN 'graduated' ELSE 'promoted' END)::text
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
