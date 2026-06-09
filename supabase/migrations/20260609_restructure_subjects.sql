-- Restructure subjects: deduplicate to unique names + create subject_assignments for class-teacher mapping
-- Run this in the Supabase Dashboard SQL editor (SQL > New query > paste > Run)

BEGIN;

-- 1. Create subject_assignments table (class-teacher mapping per subject)
CREATE TABLE IF NOT EXISTS subject_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, class_id)
);

-- 2. Pick one canonical subject ID per unique name (alphabetically first UUID per name)
CREATE TEMP TABLE canonical_map AS
SELECT DISTINCT ON (name)
  id   AS canonical_id,
  name
FROM subjects
ORDER BY name, id;

-- 3. Populate subject_assignments from all existing subject rows
INSERT INTO subject_assignments (subject_id, class_id, teacher_id)
SELECT DISTINCT ON (c.canonical_id, s.class_id)
  c.canonical_id,
  s.class_id,
  s.teacher_id
FROM subjects s
JOIN canonical_map c ON c.name = s.name
WHERE s.class_id IS NOT NULL
ON CONFLICT (subject_id, class_id) DO NOTHING;

-- 4. Re-point results.subject_id to canonical IDs
UPDATE results r
SET subject_id = c.canonical_id
FROM subjects s
JOIN canonical_map c ON c.name = s.name
WHERE s.id = r.subject_id;

-- 5. Re-point timetable_entries.subject_id to canonical IDs
UPDATE timetable_entries te
SET subject_id = c.canonical_id
FROM subjects s
JOIN canonical_map c ON c.name = s.name
WHERE s.id = te.subject_id;

-- 6. Delete non-canonical duplicate subjects (all FK refs already updated above)
DELETE FROM subjects
WHERE id NOT IN (SELECT canonical_id FROM canonical_map);

-- 7. Drop class_id and teacher_id from subjects (now in subject_assignments)
ALTER TABLE subjects DROP COLUMN IF EXISTS class_id;
ALTER TABLE subjects DROP COLUMN IF EXISTS teacher_id;

-- 8. Add unique name constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subjects_name_unique' AND conrelid = 'subjects'::regclass
  ) THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_name_unique UNIQUE (name);
  END IF;
END $$;

-- 9. RLS for subject_assignments
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_assignments_select" ON subject_assignments;
DROP POLICY IF EXISTS "subject_assignments_write"  ON subject_assignments;

CREATE POLICY "subject_assignments_select" ON subject_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "subject_assignments_write" ON subject_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

COMMIT;
