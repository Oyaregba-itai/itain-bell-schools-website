#!/bin/bash

# Load staff accounts and create Supabase users via CLI
# First, let's check if we can use supabase CLI

echo "📊 Creating auth users for staff members..."
echo "================================================================================"

# Use supabase CLI to create users
# Note: The CLI needs to be used with the correct commands

npx supabase link --project-ref mcpajyzmdyvolpkwfmpq

# Now let's use the SDK to create users by reading the JSON and using curl
