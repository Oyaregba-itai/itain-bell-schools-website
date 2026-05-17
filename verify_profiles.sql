-- Verify all users have profiles
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.user_id WHERE p.id IS NULL) as users_without_profiles
FROM auth.users;