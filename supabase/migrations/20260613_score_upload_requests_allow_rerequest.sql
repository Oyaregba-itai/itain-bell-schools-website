-- The original UNIQUE(head_teacher_id, class_id, subject_id) constraint had
-- no status discriminator, so once a request was denied, the head teacher
-- could never request access to that subject/class again — the insert
-- would hit a unique violation and fail silently.
--
-- Replace with a partial unique index that only applies to pending requests,
-- so a new request can be made after a previous one was approved/denied.

ALTER TABLE public.score_upload_requests
  DROP CONSTRAINT IF EXISTS score_upload_requests_head_teacher_id_class_id_subject_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS score_upload_requests_pending_unique
  ON public.score_upload_requests (head_teacher_id, class_id, subject_id)
  WHERE (status = 'pending');
