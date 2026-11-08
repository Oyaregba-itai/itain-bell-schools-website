-- Add a dedicated receptionist role so parents can address the front office.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';
