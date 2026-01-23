# CRITICAL: Share Link Fix - Root Cause & Solution

## 🔴 THE BRUTAL TRUTH

Your share links break because of **THREE critical issues** that compound each other:

### Issue #1: Auth Client Interference (PRIMARY)
**Location**: `src/pages/PublicDashboard.tsx:3`
```typescript
// ❌ WRONG - This client persists sessions and tries to use auth
import { supabase } from "@/integrations/supabase/client";
```

**Problem**: 
- Regular `supabase` client has `persistSession: true` and `autoRefreshToken: true`
- In incognito mode, it tries to read from localStorage (which is empty)
- This can cause edge function calls to fail or be delayed
- **Why it breaks after changes**: Any auth-related change affects this client

**Fix Applied**: Created `publicSupabase` client with NO session persistence

### Issue #2: Schema Mismatch (SECONDARY)
**Location**: `supabase/functions/get-public-dashboard/index.ts:125-162`

**Problem**:
- Code expects: `owner_user_id`, `is_active`, `include_stats`, `include_countries`, `include_memories`
- Database might have: `user_id`, `included_fields` (JSONB)
- Edge function queries fail when columns don't exist
- Error is swallowed, shows "not found" instead of schema error

**Fix Applied**: Edge function now handles both schemas with fallbacks

### Issue #3: No Error Visibility (TERTIARY)
**Location**: `src/pages/PublicDashboard.tsx:165-172`

**Problem**:
- Errors from edge function are shown as generic "Share link not available"
- No way to see what actually failed
- Can't distinguish between "not found" vs "schema error" vs "auth error"

**Fix Applied**: Added debug mode (`?debug=1`) and better error logging

---

## ✅ WHAT I FIXED

### File 1: `src/integrations/supabase/public-client.ts` (NEW)
**Purpose**: Isolated client for public routes that NEVER uses auth

```typescript
export const publicSupabase = createClient(..., {
  auth: {
    persistSession: false,  // ← CRITICAL: No session storage
    autoRefreshToken: false, // ← CRITICAL: No token refresh
    detectSessionInUrl: false, // ← CRITICAL: No URL session detection
  }
});
```

### File 2: `src/pages/PublicDashboard.tsx` (MODIFIED)
**Line 3**: Changed import
```typescript
// BEFORE:
import { supabase } from "@/integrations/supabase/client";

// AFTER:
import { publicSupabase } from "@/integrations/supabase/public-client";
```

**Line 159**: Changed function call
```typescript
// BEFORE:
const { data, error } = await supabase.functions.invoke(...)

// AFTER:
const { data, error } = await publicSupabase.functions.invoke(...)
```

### File 3: `supabase/functions/get-public-dashboard/index.ts` (MODIFIED)
**Lines 125-193**: Added schema-agnostic query logic
- Tries new schema first (`owner_user_id`, `is_active`)
- Falls back to old schema (`user_id`, `included_fields`)
- Provides detailed debug info on failures

### File 4: `supabase/migrations/20260123000000_update_share_links_schema.sql` (NEW)
**Purpose**: Migrates database to match expected schema
- Renames `user_id` → `owner_user_id`
- Adds `is_active`, `include_*` columns
- Migrates data from JSONB to boolean columns

---

## 🧪 HOW TO TEST THE FIX

### Step 1: Run Migration
```sql
-- In Supabase Dashboard → SQL Editor
-- Copy and paste the entire contents of:
-- supabase/migrations/20260123000000_update_share_links_schema.sql
```

### Step 2: Deploy Edge Function
```bash
supabase functions deploy get-public-dashboard
```

### Step 3: Test Share Link
1. Generate a new share link from `/family` page
2. Copy the URL
3. Open in **incognito window** (CRITICAL - must be incognito)
4. Should work without "Share link not found" error

### Step 4: If Still Broken - Use Debug Mode
Add `?debug=1` to URL:
```
https://familytraveltracker.com/share/dashboard/c29341b2751eaa1fbd9752967214be46?debug=1
```

This shows detailed debug info including:
- Which schema was detected
- What columns were found
- Exact error messages
- Query steps taken

---

## 🔍 DIAGNOSTIC QUERIES

Run these in Supabase SQL Editor to verify:

```sql
-- 1. Check if your token exists
SELECT 
  token,
  owner_user_id,
  user_id,  -- in case old schema
  is_active,
  include_stats,
  include_countries,
  include_memories,
  created_at
FROM share_links 
WHERE token = 'c29341b2751eaa1fbd9752967214be46';

-- 2. Check table schema
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'share_links'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'share_links';
```

---

## 🛡️ PREVENTING FUTURE BREAKAGE

### Rule #1: NEVER Use Auth Client for Public Routes
✅ **DO THIS**:
```typescript
// For public routes (/share/*, /public/*)
import { publicSupabase } from "@/integrations/supabase/public-client";
```

❌ **NEVER DO THIS**:
```typescript
// For public routes
import { supabase } from "@/integrations/supabase/client";
```

### Rule #2: Test in Incognito After EVERY Change
- Any change to auth logic
- Any change to Supabase client config
- Any change to routes
- **MUST** test share links in incognito

### Rule #3: Keep Public Routes Isolated
- Don't wrap public routes in auth providers
- Don't use auth hooks in public components
- Don't check `user` state in public pages

---

## 📊 EXPECTED BEHAVIOR AFTER FIX

### ✅ Working Share Link
1. User clicks "Share" button → generates token
2. Token saved to `share_links` table
3. URL generated: `/share/dashboard/{token}`
4. **Incognito user opens URL** → edge function called with `publicSupabase`
5. Edge function finds token (handles both schemas)
6. Data returned and displayed
7. ✅ **SUCCESS**

### ❌ Broken Share Link (Before Fix)
1. User clicks "Share" button → generates token
2. Token saved to `share_links` table
3. URL generated: `/share/dashboard/{token}`
4. **Incognito user opens URL** → edge function called with regular `supabase` client
5. Client tries to use auth session (doesn't exist in incognito)
6. Edge function query fails (schema mismatch or auth issue)
7. ❌ **"Share link not found or is private"**

---

## 🎯 THE BOTTOM LINE

**Why it keeps breaking**: You're using an authenticated Supabase client for a public route. Every time you change auth logic, it affects the share link feature.

**The fix**: Use a completely isolated public client that never touches auth. This makes share links immune to auth changes.

**The migration**: Run it once to fix the schema. After that, the edge function handles both old and new schemas gracefully.

---

## 🚨 IF IT'S STILL BROKEN

1. **Check the migration ran**: Run diagnostic query #2 above
2. **Check edge function deployed**: Look for latest deployment in Supabase dashboard
3. **Check debug output**: Add `?debug=1` to URL and check console
4. **Check browser console**: Look for CORS errors or network failures
5. **Check Supabase logs**: Go to Edge Functions → get-public-dashboard → Logs

The debug output will tell you EXACTLY what's wrong.
