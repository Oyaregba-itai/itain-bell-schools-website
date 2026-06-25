DROP POLICY IF EXISTS "Head teachers and admins manage submissions" ON report_submissions;

CREATE POLICY "Head teachers and admins manage submissions"
ON report_submissions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR head_teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM students s
    JOIN classes c ON c.id = s.class_id
    WHERE s.id = report_submissions.student_id
    AND c.head_teacher_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR head_teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM students s
    JOIN classes c ON c.id = s.class_id
    WHERE s.id = report_submissions.student_id
    AND c.head_teacher_id = auth.uid()
  )
);
