import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mcpajyzmdyvolpkwfmpq.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

const students = [
  { sn: 1, name: "Chizaram Charis Maduabuchukwu", class: "AMAZING ANGELS" },
  { sn: 2, name: "Marial Iseoluwa John", class: "AMAZING ANGELS" },
  { sn: 3, name: "Angel Udeme Abasi", class: "AMAZING ANGELS" },
  { sn: 4, name: "Fifooluwa Moradeyo", class: "AMAZING ANGELS" },
  { sn: 5, name: "Gratitude Adejuiyigbe", class: "AMAZING ANGELS" },
  { sn: 6, name: "Patrick Anaya Chinaza", class: "AMAZING ANGELS" },
  { sn: 7, name: "Monioluwa Zuriel Ojekunle", class: "AMAZING ANGELS" },
  { sn: 8, name: "Kushoro Keon", class: "AMAZING ANGELS" },
  { sn: 9, name: "Akinbiyi Oreofe", class: "AMAZING ANGELS" },
  { sn: 10, name: "Agboola Joseph", class: "EXPLORERS" },
  { sn: 11, name: "Kindle Favor", class: "EXPLORERS" },
  { sn: 12, name: "John Moses", class: "MAGNIFICENT" },
  { sn: 13, name: "Etoh Munachi", class: "MAGNIFICENT" },
  { sn: 14, name: "Eziohuru Daina Chimemerie", class: "MAGNIFICENT" },
  { sn: 15, name: "Okoye Jason", class: "MAGNIFICENT" },
  { sn: 16, name: "Akinsola Emmanuel", class: "MAGNIFICENT" },
  { sn: 17, name: "Akomolade Morolaoluwa", class: "MAGNIFICENT" },
  { sn: 18, name: "Akindele Emmanuel", class: "MAGNIFICENT" },
  { sn: 19, name: "Wenegieme Aretha", class: "MAGNIFICENT" },
  { sn: 20, name: "Olowe Erife", class: "MAGNIFICENT" },
  { sn: 21, name: "Franklin Jane Temiloluwa", class: "MAGNIFICENT" },
  { sn: 22, name: "Abubakar Orange-Win", class: "DISCOVERERS" },
  { sn: 23, name: "Adekunle Ezra", class: "DISCOVERERS" },
  { sn: 24, name: "Agboola Jedidiah", class: "DISCOVERERS" },
  { sn: 25, name: "Akinola Oluwasorekunmi", class: "DISCOVERERS" },
  { sn: 26, name: "Etoh Caleb", class: "DISCOVERERS" },
  { sn: 27, name: "Hamza Arif", class: "DISCOVERERS" },
  { sn: 28, name: "Owoosho Michael", class: "DISCOVERERS" },
  { sn: 29, name: "Adejumo Elizabeth", class: "DISCOVERERS" },
  { sn: 30, name: "Ikediashi Ugochukwu", class: "DISCOVERERS" },
  { sn: 31, name: "Oguoidiegwu Adaeze", class: "DISCOVERERS" },
  { sn: 32, name: "Omilola Chloe", class: "DISCOVERERS" },
  { sn: 33, name: "Otitoloju Oluwadamipe", class: "DISCOVERERS" },
  { sn: 34, name: "Umoetuk Uwanabasi", class: "DISCOVERERS" },
  { sn: 35, name: "Jan Franklin", class: "NOBLE" },
  { sn: 36, name: "Oladunmade Durojaiye", class: "NOBLE" },
  { sn: 37, name: "Anne Akindele", class: "NOBLE" },
  { sn: 38, name: "Morike Adeniyi", class: "NOBLE" },
  { sn: 39, name: "Tiffany Atohengbe", class: "NOBLE" },
  { sn: 40, name: "Oki Fajano", class: "NOBLE" },
  { sn: 41, name: "Modade Bakare", class: "NOBLE" },
  { sn: 42, name: "Melchizedek akinola", class: "NOBLE" },
  { sn: 43, name: "Aviation Mogoli", class: "YEAR 1" },
  { sn: 44, name: "Uzoamaka Ikediashi", class: "YEAR 1" },
  { sn: 45, name: "Liam Scott", class: "YEAR 1" },
  { sn: 46, name: "Joy Agboola", class: "YEAR 1" },
  { sn: 47, name: "Kayito Okpara", class: "YEAR 1" },
  { sn: 48, name: "Melvin Nzete", class: "YEAR 1" },
  { sn: 49, name: "Nisimi Akinbyi", class: "YEAR 1" },
  { sn: 50, name: "Asher Aderemi", class: "YEAR 1" },
  { sn: 51, name: "Feivel Wenegieme Franklin", class: "YEAR 1" },
  { sn: 52, name: "Mary Godonu", class: "YEAR 1" },
  { sn: 53, name: "Adeniyi Morife", class: "YEAR 2" },
  { sn: 54, name: "Adike Nonso", class: "YEAR 2" },
  { sn: 55, name: "Agboola John", class: "YEAR 2" },
  { sn: 56, name: "Anyanwu Chimdimdu", class: "YEAR 2" },
  { sn: 57, name: "Charles Adesuwa", class: "YEAR 2" },
  { sn: 58, name: "Chukwuebuka Chiamaka", class: "YEAR 2" },
  { sn: 59, name: "Eziohuru Kosiso", class: "YEAR 2" },
  { sn: 60, name: "Omega Aurelia", class: "YEAR 2" },
  { sn: 61, name: "Okpala Kaisochukwu", class: "YEAR 2" },
  { sn: 62, name: "Okonkwo Chiamaka", class: "YEAR 2" },
  { sn: 63, name: "Olokun Imran", class: "YEAR 2" },
  { sn: 64, name: "Onabadejo Titoluwanimi", class: "YEAR 2" },
  { sn: 65, name: "Oyeyemi Ayomiposi", class: "YEAR 2" },
  { sn: 66, name: "Udeh Akwaugo", class: "YEAR 2" },
  { sn: 67, name: "Adekunle Adriel", class: "YEAR 3" },
  { sn: 68, name: "Aderemi David", class: "YEAR 3" },
  { sn: 69, name: "Muhammad Abdul-Baasit", class: "YEAR 3" },
  { sn: 70, name: "Bakare Murewa", class: "YEAR 3" },
  { sn: 71, name: "Olowe Korinayo", class: "YEAR 3" },
  { sn: 72, name: "Wenegieme Benjamin Franklin", class: "YEAR 3" },
  { sn: 73, name: "James Jedidiah", class: "YEAR 3" },
  { sn: 74, name: "Desalu Oluwatobiloba", class: "YEAR 3" },
  { sn: 75, name: "Owate Oreofeoluwa", class: "YEAR 3" },
  { sn: 76, name: "Leonard Charles", class: "YEAR 3" },
  { sn: 77, name: "Raheem Inioluwa", class: "YEAR 3" },
  { sn: 78, name: "Akimbiyi  Dunsimi", class: "YEAR 3" },
  { sn: 79, name: "Mogoli Zion", class: "YEAR 4" },
  { sn: 80, name: "Okonkwo Chizaram", class: "YEAR 4" },
  { sn: 81, name: "Falobi Victoria", class: "YEAR 4" },
  { sn: 82, name: "Ikediashi Olisaemeka", class: "YEAR 4" },
  { sn: 83, name: "Popoola Oyindamola", class: "YEAR 4" },
  { sn: 84, name: "Kareem Muqsit", class: "YEAR 4" },
  { sn: 85, name: "Moradeyo Omolayo", class: "YEAR 4" },
  { sn: 86, name: "Adike Caleb", class: "YEAR 4" },
  { sn: 87, name: "Owate Inioluwa", class: "YEAR 4" },
  { sn: 88, name: "Udeh Munachimso", class: "YEAR 4" },
  { sn: 89, name: "Eiluorir Osiejiele", class: "YEAR 4" },
  { sn: 90, name: "Eziohuru Chikanyima", class: "YEAR 4" },
  { sn: 91, name: "Adebule Amelia", class: "YEAR 5" },
  { sn: 92, name: "Adekoya Oluwatosin", class: "YEAR 5" },
  { sn: 93, name: "Afolabi Tantoluwa", class: "YEAR 5" },
  { sn: 94, name: "Deinbo Sobura", class: "YEAR 5" },
  { sn: 95, name: "Hamza Faisal", class: "YEAR 5" },
  { sn: 96, name: "Mogoli Salem", class: "YEAR 5" },
  { sn: 97, name: "Monye Chizaram", class: "YEAR 5" },
  { sn: 98, name: "Muhammad Muheeb", class: "YEAR 5" },
  { sn: 99, name: "Odusote Aramide", class: "YEAR 5" },
  { sn: 100, name: "Oyeyemi Olamiposi", class: "YEAR 5" },
  { sn: 101, name: "Raheem Rahman", class: "YEAR 5" },
  { sn: 102, name: "Moradeyo Marayomigba", class: "YEAR 5" },
  { sn: 103, name: "Okonkwo Kamsi", class: "YEAR 6" },
  { sn: 104, name: "Onabadejo Tomiloba", class: "YEAR 6" },
  { sn: 105, name: "Odusote Araoluwa", class: "YEAR 6" },
  { sn: 106, name: "Adewale Sapphire", class: "YEAR 6" },
  { sn: 107, name: "Kosoko Armani", class: "YEAR 6" },
];

async function seedStudents() {
  console.log(`🌱 Starting to seed ${students.length} students...`);

  // Generate unique emails for each student
  const studentEmails = students.map((student) => {
    const namePart = student.name
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z.]/g, "");
    return {
      ...student,
      email: `student.${namePart}.${student.sn}@itainbell.school`,
      password: `Student@${student.sn}2024!`,
    };
  });

  let successCount = 0;
  let errorCount = 0;

  // Create auth users and profiles in batches
  for (let i = 0; i < studentEmails.length; i += 10) {
    const batch = studentEmails.slice(i, Math.min(i + 10, studentEmails.length));

    const results = await Promise.all(
      batch.map(async (student) => {
        try {
          // Create auth user
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              email: student.email,
              password: student.password,
              email_confirm: true,
            });

          if (authError || !authData.user) {
            console.error(
              `❌ Error creating auth user for ${student.name}:`,
              authError?.message
            );
            return false;
          }

          const userId = authData.user.id;

          // Insert profile
          const { error: profileError } = await supabase.from("profiles").insert({
            user_id: userId,
            full_name: student.name,
            email: student.email,
          });

          if (profileError) {
            console.error(
              `❌ Error creating profile for ${student.name}:`,
              profileError.message
            );
            return false;
          }

          // Insert user role
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: userId,
            role: "parent", // Default role for students
          });

          if (roleError) {
            console.error(
              `❌ Error assigning role to ${student.name}:`,
              roleError.message
            );
            return false;
          }

          console.log(
            `✅ Created student: ${student.name} (${student.class}) - Email: ${student.email}`
          );
          return true;
        } catch (error) {
          console.error(
            `❌ Unexpected error for ${student.name}:`,
            error instanceof Error ? error.message : error
          );
          return false;
        }
      })
    );

    successCount += results.filter((r) => r).length;
    errorCount += results.filter((r) => !r).length;

    console.log(
      `Progress: ${i + batch.length}/${studentEmails.length} students processed`
    );
  }

  console.log(`\n✨ Seeding complete!`);
  console.log(`✅ Successfully created: ${successCount} students`);
  console.log(`❌ Failed: ${errorCount} students`);
}

seedStudents().catch(console.error);
