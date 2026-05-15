-- STAFF ACCOUNTS BULK INSERT SCRIPT
-- This script adds all 24 staff members to the users table in Supabase
-- Note: You must manually create auth users in Supabase Dashboard first

-- Insert all staff into public.users table
INSERT INTO public.users (email, full_name, role) VALUES
('elizabeth.staff@itainbell.school', 'Miss Elizabeth', 'teacher'),
('elizabeth.adigwe@itainbell.school', 'Miss Elizabeth Adigwe', 'teacher'),
('kehinde.ademoyegun@itainbell.school', 'Miss Kehinde Ademoyegun', 'teacher'),
('mary.edet@itainbell.school', 'Miss Mary Edet', 'teacher'),
('mercy.uche@itainbell.school', 'Miss Mercy Uche', 'teacher'),
('ogiji.glory@itainbell.school', 'Miss Ogiji Glory', 'teacher'),
('omowunmi.azeez@itainbell.school', 'Miss Omowunmi Azeez', 'teacher'),
('vhrmdah.ayuba@itainbell.school', 'Miss Vhrmdah Ayuba', 'teacher'),
('godiya.yakubu@itainbell.school', 'Mr Godiya Yakubu', 'teacher'),
('james.hakuri@itainbell.school', 'Mr James Hakuri', 'teacher'),
('nicolas.staff@itainbell.school', 'Mr Nicolas', 'teacher'),
('oyebode.staff@itainbell.school', 'Mr Oyebode', 'teacher'),
('segun.adedunye@itainbell.school', 'Mr Segun Adedunye', 'teacher'),
('adesola.ojekunle@itainbell.school', 'Mrs Adesola Ojekunle', 'teacher'),
('balogun.wuraola@itainbell.school', 'Mrs Balogun Wuraola', 'teacher'),
('blessing.ayodele@itainbell.school', 'Mrs Blessing Ayodele', 'teacher'),
('egele.olubunmi@itainbell.school', 'Mrs Egele  Olubunmi', 'teacher'),
('evelyn.odogwu@itainbell.school', 'Mrs Evelyn Odogwu', 'teacher'),
('goodness.duru@itainbell.school', 'Mrs Goodness Duru', 'teacher'),
('kushoro.adedayo@itainbell.school', 'Mrs Kushoro Adedayo', 'teacher'),
('nse.nwajea@itainbell.school', 'Mrs Nse Nwajea', 'teacher'),
('oloje.ronke@itainbell.school', 'Mrs Oloje Ronke', 'teacher'),
('peace.wenegieme@itainbell.school', 'Mrs Peace Judy Wenegieme', 'teacher'),
('yetunde.bakare@itainbell.school', 'Mrs Yetunde Bakare', 'teacher')
ON CONFLICT (email) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as total_staff FROM public.users WHERE role = 'teacher';
