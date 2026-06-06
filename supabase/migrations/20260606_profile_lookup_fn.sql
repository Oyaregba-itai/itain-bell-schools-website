-- Public function to look up a user's name and role by email.
-- Used by the two-step login page before the user authenticates.
-- Only returns full_name and role — no sensitive data.
CREATE OR REPLACE FUNCTION public.get_profile_by_email(input_email text)
RETURNS TABLE(full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
    SELECT p.full_name, r.role::text
    FROM auth.users u
    JOIN public.profiles p ON p.user_id = u.id
    JOIN public.user_roles r ON r.user_id = u.id
    WHERE lower(u.email) = lower(input_email)
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO authenticated;
