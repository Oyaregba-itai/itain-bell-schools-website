-- Create users table for storing user profiles and roles
-- This table links to auth.users via email for Supabase Auth integration

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'creche_staff')) DEFAULT 'teacher',
  phone VARCHAR(20),
  staff_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'admin'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Admins can insert users
CREATE POLICY "Admins can create users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'admin'
    )
  );

-- Admins can update users
CREATE POLICY "Admins can update users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email');

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
