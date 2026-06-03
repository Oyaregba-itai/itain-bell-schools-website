-- Clear existing students and re-insert from official list
DELETE FROM public.students;

INSERT INTO public.students (first_name, last_name, full_name, class_id, school_section) VALUES
-- AMAZING ANGELS
('Chizaram Charis', 'Maduabuchukwu', 'Chizaram Charis Maduabuchukwu', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Marial Iseoluwa', 'John', 'Marial Iseoluwa John', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Angel Udeme', 'Abasi', 'Angel Udeme Abasi', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Fifooluwa', 'Moradeyo', 'Fifooluwa Moradeyo', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Gratitude', 'Adejuiyigbe', 'Gratitude Adejuiyigbe', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Patrick Anaya', 'Chinaza', 'Patrick Anaya Chinaza', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Monioluwa Zuriel', 'Ojekunle', 'Monioluwa Zuriel Ojekunle', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Kushoro', 'Keon', 'Kushoro Keon', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),
('Akinbiyi', 'Oreofe', 'Akinbiyi Oreofe', 'd88fab95-3333-4ec0-a0a1-88605d361c4b', 'nursery'),

-- EXPLORERS
('Agboola', 'Joseph', 'Agboola Joseph', 'b75d0163-852b-4e23-b3d5-3196dc2cd241', 'nursery'),
('Kindle', 'Favor', 'Kindle Favor', 'b75d0163-852b-4e23-b3d5-3196dc2cd241', 'nursery'),

-- MAGNIFICENT
('John', 'Moses', 'John Moses', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Etoh', 'Munachi', 'Etoh Munachi', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Eziohuru Daina', 'Chimemerie', 'Eziohuru Daina Chimemerie', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Okoye', 'Jason', 'Okoye Jason', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Akinsola', 'Emmanuel', 'Akinsola Emmanuel', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Akomolade', 'Morolaoluwa', 'Akomolade Morolaoluwa', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Akindele', 'Emmanuel', 'Akindele Emmanuel', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Wenegieme', 'Aretha', 'Wenegieme Aretha', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Olowe', 'Erife', 'Olowe Erife', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),
('Franklin Jane', 'Temiloluwa', 'Franklin Jane Temiloluwa', '4fe83128-6e01-4c67-a2a0-087722e6de8d', 'nursery'),

-- DISCOVERERS
('Abubakar', 'Orange-Win', 'Abubakar Orange-Win', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Adekunle', 'Ezra', 'Adekunle Ezra', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Agboola', 'Jedidiah', 'Agboola Jedidiah', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Akinola', 'Oluwasorekunmi', 'Akinola Oluwasorekunmi', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Etoh', 'Caleb', 'Etoh Caleb', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Hamza', 'Arif', 'Hamza Arif', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Owoosho', 'Michael', 'Owoosho Michael', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Adejumo', 'Elizabeth', 'Adejumo Elizabeth', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Ikediashi', 'Ugochukwu', 'Ikediashi Ugochukwu', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Oguoidiegwu', 'Adaeze', 'Oguoidiegwu Adaeze', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Omilola', 'Chloe', 'Omilola Chloe', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Otitoloju', 'Oluwadamipe', 'Otitoloju Oluwadamipe', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),
('Umoetuk', 'Uwanabasi', 'Umoetuk Uwanabasi', 'e44ade7a-596b-4711-8dcc-41c0b8224450', 'nursery'),

-- NOBLE
('Jan', 'Franklin', 'Jan Franklin', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Oladunmade', 'Durojaiye', 'Oladunmade Durojaiye', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Anne', 'Akindele', 'Anne Akindele', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Morike', 'Adeniyi', 'Morike Adeniyi', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Tiffany', 'Atohengbe', 'Tiffany Atohengbe', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Oki', 'Fajano', 'Oki Fajano', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Modade', 'Bakare', 'Modade Bakare', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),
('Melchizedek', 'Akinola', 'Melchizedek Akinola', '159f91be-a301-417e-97f2-97a0b762f2e6', 'nursery'),

-- YEAR 1
('Aviation', 'Mogoli', 'Aviation Mogoli', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Uzoamaka', 'Ikediashi', 'Uzoamaka Ikediashi', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Liam', 'Scott', 'Liam Scott', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Joy', 'Agboola', 'Joy Agboola', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Kayito', 'Okpara', 'Kayito Okpara', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Melvin', 'Nzete', 'Melvin Nzete', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Nisimi', 'Akinbyi', 'Nisimi Akinbyi', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Asher', 'Aderemi', 'Asher Aderemi', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Feivel Wenegieme', 'Franklin', 'Feivel Wenegieme Franklin', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),
('Mary', 'Godonu', 'Mary Godonu', '158b7a33-4844-4cf9-b999-c21ca495f01c', 'primary'),

-- YEAR 2
('Adeniyi', 'Morife', 'Adeniyi Morife', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Adike', 'Nonso', 'Adike Nonso', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Agboola', 'John', 'Agboola John', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Anyanwu', 'Chimdimdu', 'Anyanwu Chimdimdu', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Charles', 'Adesuwa', 'Charles Adesuwa', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Chukwuebuka', 'Chiamaka', 'Chukwuebuka Chiamaka', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Eziohuru', 'Kosiso', 'Eziohuru Kosiso', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Omega', 'Aurelia', 'Omega Aurelia', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Okpala', 'Kaisochukwu', 'Okpala Kaisochukwu', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Okonkwo', 'Chiamaka', 'Okonkwo Chiamaka', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Olokun', 'Imran', 'Olokun Imran', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Onabadejo', 'Titoluwanimi', 'Onabadejo Titoluwanimi', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Oyeyemi', 'Ayomiposi', 'Oyeyemi Ayomiposi', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),
('Udeh', 'Akwaugo', 'Udeh Akwaugo', '522b62c0-889c-4ccf-85e5-e30e343fac2c', 'primary'),

-- YEAR 3
('Adekunle', 'Adriel', 'Adekunle Adriel', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Aderemi', 'David', 'Aderemi David', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Muhammad', 'Abdul-Baasit', 'Muhammad Abdul-Baasit', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Bakare', 'Murewa', 'Bakare Murewa', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Olowe', 'Korinayo', 'Olowe Korinayo', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Wenegieme Benjamin', 'Franklin', 'Wenegieme Benjamin Franklin', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('James', 'Jedidiah', 'James Jedidiah', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Desalu', 'Oluwatobiloba', 'Desalu Oluwatobiloba', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Owate', 'Oreofeoluwa', 'Owate Oreofeoluwa', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Leonard', 'Charles', 'Leonard Charles', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Raheem', 'Inioluwa', 'Raheem Inioluwa', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),
('Akimbiyi', 'Dunsimi', 'Akimbiyi Dunsimi', 'd99f8cc8-a4f9-4c80-ac9d-9ba6434acc03', 'primary'),

-- YEAR 4
('Mogoli', 'Zion', 'Mogoli Zion', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Okonkwo', 'Chizaram', 'Okonkwo Chizaram', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Falobi', 'Victoria', 'Falobi Victoria', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Ikediashi', 'Olisaemeka', 'Ikediashi Olisaemeka', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Popoola', 'Oyindamola', 'Popoola Oyindamola', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Kareem', 'Muqsit', 'Kareem Muqsit', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Moradeyo', 'Omolayo', 'Moradeyo Omolayo', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Adike', 'Caleb', 'Adike Caleb', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Owate', 'Inioluwa', 'Owate Inioluwa', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Udeh', 'Munachimso', 'Udeh Munachimso', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Eiluorir', 'Osiejiele', 'Eiluorir Osiejiele', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),
('Eziohuru', 'Chikanyima', 'Eziohuru Chikanyima', 'fe8d2a00-6921-40bc-9759-55bc6ca49eb5', 'primary'),

-- YEAR 5
('Adebule', 'Amelia', 'Adebule Amelia', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Adekoya', 'Oluwatosin', 'Adekoya Oluwatosin', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Afolabi', 'Tantoluwa', 'Afolabi Tantoluwa', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Deinbo', 'Sobura', 'Deinbo Sobura', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Hamza', 'Faisal', 'Hamza Faisal', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Mogoli', 'Salem', 'Mogoli Salem', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Monye', 'Chizaram', 'Monye Chizaram', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Muhammad', 'Muheeb', 'Muhammad Muheeb', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Odusote', 'Aramide', 'Odusote Aramide', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Oyeyemi', 'Olamiposi', 'Oyeyemi Olamiposi', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Raheem', 'Rahman', 'Raheem Rahman', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),
('Moradeyo', 'Marayomigba', 'Moradeyo Marayomigba', '0255c250-f106-42d9-9399-c3da696961a0', 'primary'),

-- YEAR 6
('Okonkwo', 'Kamsi', 'Okonkwo Kamsi', '765eed4a-7d21-49e1-8ca2-982b13f1b524', 'primary'),
('Onabadejo', 'Tomiloba', 'Onabadejo Tomiloba', '765eed4a-7d21-49e1-8ca2-982b13f1b524', 'primary'),
('Odusote', 'Araoluwa', 'Odusote Araoluwa', '765eed4a-7d21-49e1-8ca2-982b13f1b524', 'primary'),
('Adewale', 'Sapphire', 'Adewale Sapphire', '765eed4a-7d21-49e1-8ca2-982b13f1b524', 'primary'),
('Kosoko', 'Armani', 'Kosoko Armani', '765eed4a-7d21-49e1-8ca2-982b13f1b524', 'primary');
