CREATE TABLE IF NOT EXISTS public.report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  result_type VARCHAR(20) NOT NULL CHECK (result_type IN ('mid_term', 'end_of_term')),
  head_teacher_id UUID REFERENCES auth.users(id),
  head_teacher_comment TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, term_id, result_type)
);

ALTER TABLE public.report_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head teachers and admins manage submissions" ON public.report_submissions
  FOR ALL TO authenticated
  USING (head_teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (head_teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can read their class submissions" ON public.report_submissions
  FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_report_subs_student ON public.report_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_report_subs_status ON public.report_submissions(status);
CREATE INDEX IF NOT EXISTS idx_report_subs_head ON public.report_submissions(head_teacher_id);
