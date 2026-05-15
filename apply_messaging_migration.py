import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(url, key)

# Read the migration file
with open('supabase/migrations/20260515_add_messaging_system.sql', 'r') as f:
    migration_sql = f.read()

# Split by semicolon and execute each statement
statements = [s.strip() for s in migration_sql.split(';') if s.strip()]

try:
    for i, statement in enumerate(statements):
        print(f"Executing statement {i+1}/{len(statements)}...")
        result = supabase.postgrest.request('POST', '/', 
            {'method': 'POST', 'body': statement}, 
            use_bearers=True, headers={'Content-Type': 'application/json'})
        print(f"✓ Statement {i+1} completed")
    print("\n✅ All messaging tables created successfully!")
except Exception as e:
    print(f"Error: {e}")
    # Try alternative approach using raw SQL via postgrest
    print("\nUsing alternative approach via SQL...")
    
    try:
        from supabase import create_client
        import psycopg2
        
        # Parse connection details
        supabase_url = url
        db_host = supabase_url.split('https://')[1].split('.')[0] + '.supabase.co'
        
        # Use service role to execute SQL
        response = supabase.rpc('execute_sql', {
            'query': migration_sql
        }).execute()
        print("✅ Migration applied successfully!")
    except Exception as e2:
        print(f"Alternative approach also failed: {e2}")
        print("\nPlease apply the migration manually via Supabase dashboard SQL editor")
