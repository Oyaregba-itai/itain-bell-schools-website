# Supabase Storage Setup Guide

## Profile Pictures Bucket

The profile picture upload feature requires a Supabase Storage bucket named `profile-pictures`. Follow these steps to set it up:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/mcpajyzmdyvolpkwfmpq
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Set the bucket name to: `profile-pictures`
5. Choose **Private** for access level (users can only access their own files)
6. Click **Create bucket**

### Option 2: Using Supabase CLI

```bash
npx supabase buckets create profile-pictures --private
```

### RLS (Row Level Security) Policies

After creating the bucket, set up the following RLS policies to ensure secure access:

1. **For SELECT (Download)** - Users can only download their own profile pictures:
   ```
   SELECT: (auth.uid()::text = storage.foldername('profile_pictures')[1])
   ```

2. **For INSERT (Upload)** - Users can upload to their folder:
   ```
   INSERT: (auth.uid()::text = storage.foldername('profile_pictures')[1])
   ```

3. **For UPDATE (Replace)** - Users can update their own files:
   ```
   UPDATE: (auth.uid()::text = storage.foldername('profile_pictures')[1])
   ```

4. **For DELETE** - Users can delete their own files:
   ```
   DELETE: (auth.uid()::text = storage.foldername('profile_pictures')[1])
   ```

### Or Set Public Access (Less Secure)

If you want all authenticated users to see profile pictures, you can create a public bucket and set these policies:

1. Create bucket as **Public**
2. Allow all authenticated users: `auth.role() = 'authenticated'`

## Troubleshooting

- **"Bucket does not exist"**: Ensure the bucket name is exactly `profile-pictures`
- **Upload fails with 403**: RLS policies may be too restrictive. Check the policies in Storage > Policies
- **Profile picture shows as broken link**: Verify the public URL is correct in the policies

## Testing

Once set up, test the profile picture upload:
1. Go to the dashboard Profile tab
2. Click the camera icon on your profile picture
3. Select an image file (< 5MB, must be image format)
4. Upload should succeed and display the new picture
