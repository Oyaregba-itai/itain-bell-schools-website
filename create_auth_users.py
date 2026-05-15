import json
import requests
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcGFqeXptZHl2b2xwd2ZtcHEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzc4NzQ1NTMxLCJleHAiOjIwOTQzMjE1MzF9.8NJnCM6ZJJ1JOZhlrO2ey9UfOXys3CqusHXMquTkSTg"

# Load staff accounts
with open("staff_accounts.json", "r") as f:
    staff_accounts = json.load(f)

print(f"📊 Creating auth users for {len(staff_accounts)} staff members...")
print("=" * 80)

PUBLISHABLE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "apikey": PUBLISHABLE_KEY
}

successful = []
failed = []

for account in staff_accounts:
    try:
        # Create auth user via Supabase Auth REST API
        url = f"{SUPABASE_URL}/auth/v1/admin/users"
        
        payload = {
            "email": account["email"],
            "password": account["password"],
            "email_confirm": True
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in [200, 201]:
            print(f"✅ {account['staff_id']:<8} - {account['name']:<30} ({account['email']})")
            successful.append(account)
        elif response.status_code == 422 and "already" in response.text.lower():
            print(f"⚠️  {account['staff_id']:<8} - {account['name']:<30} - Already exists")
            successful.append(account)
        else:
            error = response.json() if response.text else response.status_code
            print(f"❌ {account['staff_id']:<8} - {account['name']:<30} - Error: {error}")
            failed.append((account, str(error)))
        
    except Exception as e:
        print(f"❌ {account['staff_id']:<8} - {account['name']:<30} - Error: {str(e)}")
        failed.append((account, str(e)))

print("\n" + "=" * 80)
print(f"✅ Successfully created/verified: {len(successful)} accounts")
if failed:
    print(f"❌ Failed: {len(failed)} accounts")
    print("\nFailed accounts:")
    for account, error in failed[:5]:
        print(f"  - {account['email']}: {error}")
else:
    print("✨ All staff auth users created successfully!")

print("\n📝 STAFF CAN NOW LOGIN WITH:")
print("1. Email: Their @itainbell.school email address")
print("2. Password: From staff_accounts.json")
print("3. Role: Select 'Teacher' on login page")
