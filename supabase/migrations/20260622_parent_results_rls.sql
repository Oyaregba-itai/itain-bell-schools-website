-- Allow parents to view results for their linked children
CREATE POLICY "Parents can view their children's results"
ON results FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM parent_students ps
    WHERE ps.parent_id = auth.uid()
    AND ps.student_id = results.student_id
  )
);

-- Allow all authenticated users to read results that are part of an approved
-- report submission (needed so parents can see class stats on the report card)
CREATE POLICY "Authenticated users can view approved results"
ON results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM report_submissions rs
    WHERE rs.student_id = results.student_id
    AND rs.term_id = results.term_id
    AND rs.result_type = results.result_type
    AND rs.status = 'approved'
  )
);
