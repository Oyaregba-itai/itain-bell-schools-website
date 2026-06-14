-- Add Itai Oyaregba John as a super admin account
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    'itai.oyaregba@itainbell.school', crypt('John@IBS25', gen_salt('bf', 10)),
    now(), '{"provider":"email","providers":["email"]}', '{"email_verified": true}',
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_user_id, new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', 'itai.oyaregba@itainbell.school', 'email_verified', true, 'phone_verified', false),
    'email', now(), now()
  );

  -- handle_new_user trigger already created a basic profile row; update it
  UPDATE public.profiles
  SET full_name = 'Itai Oyaregba John', email = 'itai.oyaregba@itainbell.school', is_super_admin = true
  WHERE user_id = new_user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'admin');
END $$;
