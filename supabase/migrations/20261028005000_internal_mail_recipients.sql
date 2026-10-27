-- Authenticated portal users may address internal correspondence to staff and parents.
CREATE OR REPLACE FUNCTION public.get_internal_mail_recipients()
RETURNS TABLE(user_id uuid, full_name text, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.full_name::text, p.email::text, ur.role::text
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE auth.uid() IS NOT NULL AND p.user_id <> auth.uid()
  ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 WHEN 'parent' THEN 3 ELSE 4 END, p.full_name;
$$;
REVOKE ALL ON FUNCTION public.get_internal_mail_recipients() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_internal_mail_recipients() TO authenticated;
