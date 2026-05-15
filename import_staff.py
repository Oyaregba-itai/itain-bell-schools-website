import json
import subprocess
from supabase import create_client, Client

# Load credentials from .env.local
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials. Please ensure .env.local is configured.")
    exit(1)

# Load staff accounts
with open("staff_accounts.json", "r") as f:
    staff_accounts = json.load(f)

print(f"📊 Loading {len(staff_accounts)} staff accounts from staff_accounts.json")
print("=" * 80)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Import successful accounts
successful = []
failed = []

for account in staff_accounts:
    try:
        # Insert user into public.users table
        response = supabase.table("users").insert({
            "email": account["email"],
            "full_name": account["name"],
            "role": account["role"],
            "staff_id": account["staff_id"]
        }).execute()
        
        print(f"✅ {account['staff_id']:<8} - {account['name']:<30} ({account['email']})")
        successful.append(account)
        
    except Exception as e:
        print(f"❌ {account['staff_id']:<8} - {account['name']:<30} - Error: {str(e)}")
        failed.append((account, str(e)))

print("\n" + "=" * 80)
print(f"✅ Successfully created: {len(successful)} accounts")
if failed:
    print(f"❌ Failed: {len(failed)} accounts")
else:
    print("✨ All accounts created successfully!")

print("\n📝 NEXT STEPS:")
print("1. Go to Supabase Dashboard → Authentication → Users")
print("2. Click 'Add user' button for EACH staff member")
print("3. Use their email and set a password")
print("\nOR use the manual SQL script: create_staff_users.sql")
print("\nStaff credentials are in: staff_accounts.json")
