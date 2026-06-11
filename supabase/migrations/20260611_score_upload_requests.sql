-- Allow head (class) teachers to request access to upload scores for subjects
-- in their class that they don't already teach. Admin approves/denies.

CREATE TABLE IF NOT EXISTS public.score_upload_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  UNIQUE(head_teacher_id, class_id, subject_id)
);

ALTER TABLE public.score_upload_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Head teachers view own requests" ON public.score_upload_requests;
DROP POLICY IF EXISTS "Head teachers create own requests" ON public.score_upload_requests;
DROP POLICY IF EXISTS "Head teachers cancel pending requests" ON public.score_upload_requests;
DROP POLICY IF EXISTS "Admins manage requests" ON public.score_upload_requests;

CREATE POLICY "Head teachers view own requests" ON public.score_upload_requests
  FOR SELECT TO authenticated
  USING (
    head_teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Head teachers create own requests" ON public.score_upload_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    head_teacher_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND head_teacher_id = auth.uid())
  );

CREATE POLICY "Head teachers cancel pending requests" ON public.score_upload_requests
  FOR DELETE TO authenticated
  USING (head_teacher_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins manage requests" ON public.score_upload_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_score_upload_requests_head ON public.score_upload_requests(head_teacher_id);
CREATE INDEX IF NOT EXISTS idx_score_upload_requests_status ON public.score_upload_requests(status);
