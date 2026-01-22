# How to Apply the Dashboard Sharing Migration

## The Problem
The error "Could not find the 'dashboard_share_token' column" means the migration file exists but hasn't been applied to your Supabase database yet.

## Solution Options

### Option 1: Apply via Supabase Dashboard (Recommended - Fastest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20260122090142_add_dashboard_share_token.sql`
6. Paste it into the SQL editor
7. Click **Run** (or press Ctrl+Enter)
8. You should see "Success. No rows returned"

### Option 2: Use Supabase CLI (If you have it installed)

```bash
# If you have Supabase CLI installed locally
supabase db push

# Or link to your remote project and push
supabase link --project-ref your-project-ref
supabase db push
```

### Option 3: Push to GitHub/Lovable (Auto-deploy)

If Lovable automatically applies migrations on deploy:
1. Commit and push the migration file to GitHub
2. Lovable should automatically apply it
3. Wait for deployment to complete

**Note**: This is the slowest option and may not auto-apply migrations.

## Verification

After applying the migration, verify it worked:

1. Go to Supabase Dashboard → **Table Editor**
2. Find the `share_profiles` table
3. Check if it has a `dashboard_share_token` column
4. Or run this SQL query:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'share_profiles' 
   AND column_name = 'dashboard_share_token';
   ```
   Should return 1 row.

## Testing After Migration

Once the migration is applied:
1. Refresh your app
2. Click "Share dashboard" button
3. It should now work without errors
4. You'll get a shareable link like: `familytraveltracker.com/dashboard/{token}`

## Code Verification

I've verified the code logic and it's correct:
- ✅ Error handling is in place
- ✅ Token generation works
- ✅ Migration detection works
- ✅ All required permissions are set
- ✅ Public dashboard route is configured

The only missing piece is applying the migration to your database.
