-- Migration: Public events, admission applications, grade scales, teacher classes

-- 1. Allow unauthenticated users to view public events
DROP POLICY IF EXISTS "Public can view public events" ON public.events;
CREATE POLICY "Public can view public events" ON public.events
  FOR SELECT TO anon USING (is_public = true);

-- 2. Admission applications table
CREATE TABLE IF NOT EXISTS public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
  class_applying_for VARCHAR(100),
  school_section VARCHAR(50) CHECK (school_section IN ('creche', 'nursery', 'primary')),
  parent_name VARCHAR(255) NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  parent_phone VARCHAR(50),
  address TEXT,
  previous_school VARCHAR(255),
  additional_info TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (logged-out visitors) can submit an application
CREATE POLICY "Anyone can submit admission application" ON public.admission_applications
  FOR INSERT WITH CHECK (true);

-- Only admins can view and manage applications
CREATE POLICY "Admins can manage admission applications" ON public.admission_applications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON public.admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_applications_email ON public.admission_applications(parent_email);
CREATE INDEX IF NOT EXISTS idx_admission_applications_created_at ON public.admission_applications(created_at DESC);

-- 3. Grade scale defaults
INSERT INTO public.grade_scales (min_score, max_score, grade_letter, description)
VALUES
  (75, 100,   'A', 'Excellent'),
  (60, 74.99, 'B', 'Very Good'),
  (50, 59.99, 'C', 'Good'),
  (40, 49.99, 'D', 'Pass'),
  (0,  39.99, 'F', 'Fail')
ON CONFLICT (min_score, max_score) DO NOTHING;

-- 4. Teacher-class assignments (if not already created)
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, class_id)
);

ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage teacher classes" ON public.teacher_classes;
CREATE POLICY "Admins can manage teacher classes" ON public.teacher_classes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Teachers can view their class assignments" ON public.teacher_classes;
CREATE POLICY "Teachers can view their class assignments" ON public.teacher_classes
  FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON public.teacher_classes(teacher_id);
