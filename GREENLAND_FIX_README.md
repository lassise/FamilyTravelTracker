# Greenland Database Corruption - Root Cause & Fix

## Problem Identified

**Database Value**: Greenland's `flag` field = `"GR"` (Greece's ISO2 code)  
**Correct Value**: Should be `"GL"` (Greenland's ISO2 code)

### Impact

When Greenland is added to wishlist:
1. System reads `flag = "GR"` from database
2. Maps `GR` → `GRC` (Greece's ISO3 code)
3. Colors **Greece** on the map instead of Greenland
4. Greenland remains uncolored

## How It Happened

When you clicked Greenland on the map, the system likely:
1. Searched for "Greenland" in `getAllCountries()`
2. Found partial match with "Greece" (starts with "GR")
3. Created database record with Greece's flag code

OR the system used initials "GR" from "**GR**eenland".

## The Fix

### Option 1: Run SQL Directly (Fastest)

```sql
UPDATE countries 
SET flag = 'GL'
WHERE name = 'Greenland' AND flag = 'GR';
```

**Steps:**
1. Go to your Supabase dashboard
2. SQL Editor → New Query
3. Paste SQL above
4. Run query
5. Refresh your app

### Option 2: Delete & Re-add (Simplest)

1. Remove Greenland from wishlist
2. Delete Greenland from database (if possible)
3. Add Greenland again - it should get correct `GL` code

### Option 3: Use Supabase Dashboard

1. Go to Supabase → Table Editor → `countries` table
2. Find row where `name = 'Greenland'`
3. Edit `flag` field: Change `"GR"` → `"GL"`
4. Save

## Prevention

The country creation logic in `InteractiveWorldMap.tsx` line 349:
```typescript
flag: canonical?.flag ?? '🏳️',
```

Should validate that the flag code matches the country name before insertion.

## Affected Countries

This bug could affect ANY country if the wrong code was stored during creation. Check for other suspicious flag values:

```sql
SELECT c.name, c.flag, lib.code
FROM countries c
LEFT JOIN (
  -- Compare with library data
) lib ON c.name = lib.name
WHERE c.flag != lib.code;
```
