-- Extend existing schema with new tables and columns for school management

-- Add columns to existing students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS student_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS school_section VARCHAR(50) CHECK (school_section IN ('creche', 'primary')) DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50);

-- Update existing results table with more score fields
ALTER TABLE public.results
ADD COLUMN IF NOT EXISTS assignment_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS test_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS exam_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS continuous_assessment DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS total_score DECIMAL(5, 2);

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  description TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create assignment scores table
CREATE TABLE IF NOT EXISTS public.assignment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score DECIMAL(5, 2),
  max_score DECIMAL(5, 2) DEFAULT 100,
  feedback TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- Create tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('quiz', 'mid_term', 'final_exam', 'class_test')),
  test_date DATE,
  max_score DECIMAL(5, 2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create test scores table
CREATE TABLE IF NOT EXISTS public.test_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score DECIMAL(5, 2),
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_id, student_id)
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) CHECK (event_type IN ('holiday', 'school_event', 'sports_day', 'exam', 'parent_meeting', 'other')),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  marked_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, attendance_date)
);

-- Create parent-student relationship table
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

-- Create grade scale table
CREATE TABLE IF NOT EXISTS public.grade_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_score DECIMAL(5, 2),
  max_score DECIMAL(5, 2),
  grade_letter VARCHAR(2),
  description VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(min_score, max_score)
);

-- Update announcements table to include priority
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update timetable_entries to include classroom
ALTER TABLE public.timetable_entries
ADD COLUMN IF NOT EXISTS classroom VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignment_scores_student_id ON public.assignment_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_tests_subject_id ON public.tests(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_scores_student_id ON public.test_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);

-- Enable RLS on new tables
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_scales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables

-- Assignment policies
CREATE POLICY "Teachers can manage their assignments" ON public.assignments
  FOR ALL USING (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid()) 
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());

CREATE POLICY "Admins can manage all assignments" ON public.assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students and parents can view assignments" ON public.assignments
  FOR SELECT USING (true);

-- Assignment scores policies
CREATE POLICY "Teachers can manage assignment scores" ON public.assignment_scores
  FOR ALL USING (
    assignment_id IN (
      SELECT id FROM public.assignments WHERE teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM public.assignments WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assignment scores" ON public.assignment_scores
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view their children's scores" ON public.assignment_scores
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

-- Test policies
CREATE POLICY "Teachers can manage their tests" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());

CREATE POLICY "Admins can manage all tests" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students and parents can view tests" ON public.tests
  FOR SELECT USING (true);

-- Test scores policies
CREATE POLICY "Teachers can manage test scores" ON public.test_scores
  FOR ALL USING (
    test_id IN (
      SELECT id FROM public.tests WHERE teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    test_id IN (
      SELECT id FROM public.tests WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage test scores" ON public.test_scores
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view their children's test scores" ON public.test_scores
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

-- Events policies
CREATE POLICY "Authenticated can view events" ON public.events
  FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Attendance policies
CREATE POLICY "Teachers can manage attendance" ON public.attendance
  FOR ALL USING (public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view their children's attendance" ON public.attendance
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

-- Parent students policies
CREATE POLICY "Parents can view their children" ON public.parent_students
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage parent-student relationships" ON public.parent_students
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grade scales policies
CREATE POLICY "Authenticated can view grade scales" ON public.grade_scales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage grade scales" ON public.grade_scales
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
