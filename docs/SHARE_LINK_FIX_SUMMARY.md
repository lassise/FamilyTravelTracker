# Share Link Fix - Root Cause Analysis

## THE PROBLEM (Brutally Honest)

Your share link feature breaks because of **THREE critical issues**:

### Issue #1: Schema Mismatch (PRIMARY CAUSE)
- **What's happening**: Your code expects `owner_user_id`, `is_active`, `include_*` columns
- **Reality**: Your database might still have `user_id` and `included_fields` (JSONB)
- **Why it breaks**: Edge function queries fail silently when columns don't exist
- **Fix**: Run the migration `20260123000000_update_share_links_schema.sql`

### Issue #2: Auth Client Interference (SECONDARY CAUSE)
- **What's happening**: `PublicDashboard` uses the regular `supabase` client which tries to use auth sessions
- **Reality**: In incognito mode, there's no session, but the client still tries to send auth headers
- **Why it breaks**: Edge function calls might fail or be blocked
- **Fix**: Use `publicSupabase` client (no session persistence) for public routes

### Issue #3: Edge Function Query Logic (TERTIARY CAUSE)
- **What's happening**: Edge function assumes specific column names exist
- **Reality**: If columns don't match, query fails but error is swallowed
- **Why it breaks**: "Share link not found" when it actually exists
- **Fix**: Edge function now handles both old and new schemas gracefully

## THE FIX (What I Changed)

### 1. Created Public Client (`src/integrations/supabase/public-client.ts`)
```typescript
// This client NEVER persists sessions - safe for incognito
export const publicSupabase = createClient(..., {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
```

### 2. Updated PublicDashboard to Use Public Client
- Changed from `supabase` to `publicSupabase`
- Ensures no auth interference in incognito mode

### 3. Made Edge Function Schema-Agnostic
- Tries new schema first (`owner_user_id`, `is_active`)
- Falls back to old schema (`user_id`, `included_fields`)
- Provides detailed debug info on failures

### 4. Created Migration to Fix Schema
- `20260123000000_update_share_links_schema.sql`
- Updates table to match expected schema
- Migrates existing data

## HOW TO VERIFY IT'S FIXED

### Step 1: Run the Migration
```sql
-- In Supabase SQL Editor, run:
\i supabase/migrations/20260123000000_update_share_links_schema.sql
```

Or apply via Supabase Dashboard → SQL Editor

### Step 2: Deploy Edge Function
```bash
supabase functions deploy get-public-dashboard
```

### Step 3: Test in Incognito
1. Generate a share link (while logged in)
2. Copy the URL
3. Open in incognito window
4. Should work without "Share link not found" error

### Step 4: Check Debug Info (if still broken)
Add `?debug=1` to the share URL to see detailed debug output:
```
https://familytraveltracker.com/share/dashboard/c29341b2751eaa1fbd9752967214be46?debug=1
```

## PREVENTING FUTURE BREAKAGE

### Rule #1: Never Use Auth Client for Public Routes
✅ **DO**: Use `publicSupabase` for `/share/*` routes
❌ **DON'T**: Use regular `supabase` client for public pages

### Rule #2: Always Handle Schema Mismatches
✅ **DO**: Query with fallbacks for old/new schemas
❌ **DON'T**: Assume columns exist

### Rule #3: Test in Incognito After Every Change
✅ **DO**: Test share links in incognito after any auth/schema changes
❌ **DON'T**: Assume it works because you're logged in

## DIAGNOSTIC QUERIES

If it's still broken, run these:

```sql
-- 1. Check if token exists
SELECT token, owner_user_id, user_id, is_active 
FROM share_links 
WHERE token = 'c29341b2751eaa1fbd9752967214be46';

-- 2. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'share_links';

-- 3. Check table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'share_links' 
ORDER BY ordinal_position;
```

## WHY IT KEEPS BREAKING

**The Pattern**: 
1. You make a "small" change (formatting, UI, etc.)
2. You accidentally use the wrong Supabase client
3. Or you change auth logic that affects all routes
4. Share links break because they depend on public access

**The Solution**:
- Isolate public routes completely
- Use separate client for public access
- Never mix auth logic with public routes
- Test in incognito after EVERY change
