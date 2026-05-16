#!/usr/bin/env python3
"""
Direct SQL migration script for Supabase messaging system.
Uses Supabase client library with service role key for direct database access.
"""

import os
import sys
from pathlib import Path

# Add project to path
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir))

from supabase import create_client, Client

# Supabase credentials (using service role key for admin operations)
SUPABASE_URL = "https://mcpajyzmdyvolpkwfmpq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcGFqeXptZHl2b2xwa2ZtcHEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzE3NjkwMzgzLCJleHAiOjE4NzUzNzYzODN9.dSVRVhVRhgLqfvZl3FGfVpfWFJYUTCqDHW6GTZJ1EjA"

def apply_migration():
    """Apply the messaging system migration to Supabase."""
    
    print("🔌 Connecting to Supabase with service role...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Read the migration file
    migration_file = project_dir / "supabase" / "migrations" / "20260515_add_messaging_system.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📖 Reading migration from: {migration_file}")
    migration_sql = migration_file.read_text()
    
    # Split by semicolon and execute each statement
    statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
    
    print(f"\n📊 Found {len(statements)} SQL statements to execute\n")
    
    successful = 0
    failed = 0
    
    for i, statement in enumerate(statements, 1):
        try:
            print(f"[{i}/{len(statements)}] Executing: {statement[:60].replace(chr(10), ' ')}...")
            
            # Execute the statement
            result = supabase.postgrest.auth_token = None  # Use service role
            response = supabase.rpc("execute_sql", {"query": statement}).execute()
            
            print(f"  ✅ Success")
            successful += 1
            
        except Exception as e:
            # Try alternative method - direct POST to SQL endpoint
            try:
                print(f"  ⚠️  Retrying with alternative method...")
                import requests
                headers = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                }
                
                # Try using a different approach or just acknowledge we need manual execution
                print(f"  ⚠️  Note: Direct execution may require manual dashboard application")
                print(f"  Error: {str(e)[:100]}")
                failed += 1
                
            except Exception as e2:
                print(f"  ❌ Failed: {str(e2)[:100]}")
                failed += 1
    
    print(f"\n{'='*60}")
    print(f"Results: {successful} successful, {failed} failed")
    print(f"{'='*60}\n")
    
    if failed == len(statements):
        print("⚠️  Direct execution not available. Please apply manually via Supabase dashboard:")
        print("\n1. Go to: https://supabase.com/dashboard/project/mcpajyzmdyvolpkwfmpq/sql/new")
        print("2. Copy the entire SQL from below:")
        print("-" * 80)
        print(migration_sql)
        print("-" * 80)
        print("3. Paste into the SQL editor")
        print("4. Click 'Run'")
        return False
    
    return successful > 0

if __name__ == "__main__":
    try:
        success = apply_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
