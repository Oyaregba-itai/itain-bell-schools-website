-- Backfill emails from auth.users into profiles for all users where email is missing
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email = '');
