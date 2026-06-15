-- Allow a separate "Acting Head of School" comment on report cards,
-- distinct from the head teacher's comment.
ALTER TABLE public.report_submissions ADD COLUMN IF NOT EXISTS head_of_school_comment text;
