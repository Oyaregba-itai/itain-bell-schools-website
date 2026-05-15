import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://mcpajyzmdyvolpkwfmpq.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcGFqeXptZHl2b2xwd2ZtcHEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzc4NzQ1NTMxLCJleHAiOjIwOTQzMjE1MzF9.8NJnCM6ZJJ1JOZhlrO2ey9UfOXys3CqusHXMquTkSTg";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Load staff accounts
const staffAccounts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "staff_accounts.json"), "utf-8")
);

console.log(
  `📊 Creating auth users for ${staffAccounts.length} staff members...`
);
console.log("=".repeat(80));

let successful = [];
let failed = [];

for (const account of staffAccounts) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    });

    if (error) {
      if (error.message && error.message.includes("already")) {
        console.log(
          `⚠️  ${account.staff_id.padEnd(8)} - ${account.name.padEnd(30)} - Already exists`
        );
        successful.push(account);
      } else {
        console.log(
          `❌ ${account.staff_id.padEnd(8)} - ${account.name.padEnd(30)} - Error: ${error.message}`
        );
        failed.push([account, error.message]);
      }
    } else {
      console.log(
        `✅ ${account.staff_id.padEnd(8)} - ${account.name.padEnd(30)} (${account.email})`
      );
      successful.push(account);
    }
  } catch (e) {
    console.log(
      `❌ ${account.staff_id.padEnd(8)} - ${account.name.padEnd(30)} - Error: ${e.message}`
    );
    failed.push([account, e.message]);
  }
}

console.log("\n" + "=".repeat(80));
console.log(`✅ Successfully created/verified: ${successful.length} accounts`);
if (failed.length > 0) {
  console.log(`❌ Failed: ${failed.length} accounts`);
  console.log("\nFailed accounts:");
  failed.slice(0, 5).forEach(([account, error]) => {
    console.log(`  - ${account.email}: ${error}`);
  });
} else {
  console.log("✨ All staff auth users created successfully!");
}

console.log("\n📝 STAFF CAN NOW LOGIN WITH:");
console.log("1. Email: Their @itainbell.school email address");
console.log("2. Password: From staff_accounts.json");
console.log("3. Role: Select 'Teacher' on login page");
