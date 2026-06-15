-- Fix score saving: teachers could not see or update results uploaded by a
-- previous teacher for the same subject/class, causing duplicate-key errors
-- on save (unique constraint on student_id, subject_id, term_id, result_type).
-- A teacher can now access a result row if they are assigned to teach that
-- subject for the student's class, or have approved upload access to it.
CREATE OR REPLACE FUNCTION public.can_access_result(_subject_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = _student_id
    AND (
      EXISTS (
        SELECT 1 FROM public.subject_assignments sa
        WHERE sa.subject_id = _subject_id AND sa.class_id = st.class_id AND sa.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.score_upload_requests sur
        WHERE sur.subject_id = _subject_id AND sur.class_id = st.class_id
          AND sur.head_teacher_id = auth.uid() AND sur.status = 'approved'
      )
    )
  );
$$;

DROP POLICY "Teachers can view results they uploaded" ON public.results;
CREATE POLICY "Teachers can view accessible results" ON public.results
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND (uploaded_by = auth.uid() OR can_access_result(subject_id, student_id))
  );

DROP POLICY "Teachers can insert results" ON public.results;
CREATE POLICY "Teachers can insert results" ON public.results
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role)
    AND uploaded_by = auth.uid()
    AND can_access_result(subject_id, student_id)
  );

DROP POLICY "Teachers can update own results" ON public.results;
CREATE POLICY "Teachers can update accessible results" ON public.results
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND (uploaded_by = auth.uid() OR can_access_result(subject_id, student_id))
  );
