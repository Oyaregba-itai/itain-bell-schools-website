CREATE TABLE public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit registration" ON public.registration_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view requests" ON public.registration_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.registration_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests" ON public.registration_requests
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));