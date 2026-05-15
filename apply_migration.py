#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv

load_dotenv('.env.local')

try:
    from supabase import create_client
except ImportError:
    print("Installing supabase...")
    os.system("pip install supabase -q")
    from supabase import create_client

url = os.getenv('VITE_SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not url or not service_key:
    print("❌ Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

print(f"Connecting to Supabase: {url}")

# Read the migration file
with open('supabase/migrations/20260515_add_messaging_system.sql', 'r') as f:
    migration_sql = f.read()

# Parse and execute statements
statements = [s.strip() for s in migration_sql.split(';') if s.strip()]

print(f"Found {len(statements)} SQL statements to execute")

supabase = create_client(url, service_key)

for i, statement in enumerate(statements, 1):
    try:
        print(f"\n[{i}/{len(statements)}] Executing statement...")
        print(f"  Statement length: {len(statement)} chars")
        
        # Use rpc to execute raw SQL - if available
        # For direct SQL, we need to use the PostgreSQL client directly
        # Since supabase-py doesn't support direct SQL execution easily,
        # we'll use the SQL editor approach
        
        # For now, provide instructions for manual application
        if i == 1:
            print("\n⚠️  Note: Direct SQL execution not supported via Supabase Python SDK")
            print("Please apply the migration manually via Supabase Dashboard:")
            print(f"\n1. Go to: {url.replace('api', 'dashboard')}/project/settings/sql-editor")
            print("2. Create new query")
            print("3. Copy the SQL from: supabase/migrations/20260515_add_messaging_system.sql")
            print("4. Execute it")
            break
            
    except Exception as e:
        print(f"❌ Error executing statement {i}: {e}")
        sys.exit(1)

print("\n✅ Migration setup guide created!")
print("\nAlternatively, you can execute the SQL file directly at:")
print("https://supabase.com/dashboard/project/mcpajyzmdyvolpkwfmpq/sql/new")
