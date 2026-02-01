# Trip Details & Visits – Analysis & Architecture

## 1. CODEBASE ANALYSIS

### Where country data is stored when using "quick add"
- **Component**: `CountryDialog` (`src/components/CountryDialog.tsx`)
- **Flow**: User selects country + family members → "Add Country"
- **Storage**:
  - New row in `countries` (name, flag/code, continent)
  - One row per selected member in **`country_visits`**: `(country_id, family_member_id, user_id)`
- **Key**: "Who visited this country" is stored only in `country_visits` (no dates yet = "quick add").

### Where the trip details form initializes
- **Component**: `CountryVisitDetailsDialog` (`src/components/CountryVisitDetailsDialog.tsx`)
- **Opened from**: `CountryTracker` when user clicks "View / Add Trips" for a country
- **Props**: `countryId`, `countryName`, `countryCode`, `onUpdate`, `buttonLabel`, `open`, `onOpenChange`
- **Initialization**: On `open`, it runs `fetchData()` which loads:
  - `country_visit_details` for this `country_id` (visits with dates)
  - `city_visits` for this country
  - `family_members` from DB
  - `visit_family_members` (visit_id → family_member_ids) for existing visits
- **New visit drafts**: Created by `createNewVisitDraft()` which always sets **`familyMemberIds: []`**. The dialog is never given "who already visited this country" from quick add.

### Where family member selection state is managed
- **Per new visit draft**: `NewVisitDraft.familyMemberIds: string[]` in `CountryVisitDetailsDialog` state (`newVisits`).
- **Per existing visit**: `visitFamilyMembers` (from DB) + `pendingFamilyMemberChanges` (local edits).
- **Quick-add data**: Lives in `country_visits`; aggregated by `useFamilyData` into **`Country.visitedBy`** (member *names*). This is never passed into `CountryVisitDetailsDialog`.

### Where "+ Add Another Visit" is implemented
- **File**: `CountryVisitDetailsDialog.tsx` ~line 1095
- **Handler**: `handleAddNewVisitDraft()` → `setNewVisits(prev => [...prev, createNewVisitDraft()])`
- **Meaning**: Adds another **visit** (same country, new date range / trip name) to the "Add Visits" list. Each item is a `NewVisitDraft` for the **same** `countryId`.

---

## 2. ROOT CAUSES

### Why family member data isn’t persisting/transferring
1. **No prop for pre-selection**: `CountryVisitDetailsDialog` only receives `countryId`, `countryName`, `countryCode`. It does not receive which family members already have a `country_visit` for this country.
2. **New drafts start empty**: `createNewVisitDraft()` always sets `familyMemberIds: []`, so every new "Add Visit" row starts with no one selected.
3. **Data exists but isn’t used**: `CountryTracker` has the full `Country` (from `useFamilyData`) with `country.visitedBy` (names). It never maps those names to family member IDs and passes them into the dialog.

### What was confusing re: multi-country vs visits
- **Visits** (`country_visit_details`): One row = one time period in **one** country. Multiple visits = multiple date ranges in the **same** country. "+ Add Another Visit" correctly adds another such row (same country).
- **Trip legs** (`trip_legs`): One row = one country segment of a **trip**. Multiple legs = multiple **countries** in one trip. This is the "multi-country trip" model (e.g. France → Italy → Spain).
- **Distinction**: "+ Add Another Visit" = same country, another time period. "+ Add Another Country To Trip" = same trip, another country (different leg). They are independent; the dialog only needed a second, clearly labeled action for "add another country to trip".

### What was preventing multi-country from being obvious
- Only one button was visible in the "Add Visits" section: "+ Add Another Visit". There was no separate "+ Add Another Country To Trip" that takes the user to a flow where they add another **country** (e.g. open Trip Wizard with current country as first leg and an empty second leg).

---

## 3. PROPOSED ARCHITECTURE

### Data structures (unchanged)
- **Quick add**: `country_visits` (country_id, family_member_id) → drives `Country.visitedBy` (names).
- **Trip details (visits)**: `country_visit_details` (per country) + `visit_family_members` (per visit).
- **Multi-country trip**: `trips` + `trip_legs` (one leg per country in that trip).

### Family member pre-selection flow
1. **CountryTracker** (has `countries` and `familyMembers`):
   - For each country, compute `initialFamilyMemberIds = familyMembers.filter(m => country.visitedBy.includes(m.name)).map(m => m.id)`.
   - Pass `initialFamilyMemberIds` into `CountryVisitDetailsDialog`.
2. **CountryVisitDetailsDialog**:
   - Accept optional prop `initialFamilyMemberIds?: string[]`.
   - In `createNewVisitDraft(initialIds?)`, set `familyMemberIds: initialIds ?? []`.
   - When adding a new visit draft, call `createNewVisitDraft(initialFamilyMemberIds)` so new rows pre-select who already visited this country (from quick add). User can still change the selection.

### Differentiating the two buttons
| Button                         | Meaning                          | Data / flow                                                                 |
|--------------------------------|----------------------------------|-----------------------------------------------------------------------------|
| **+ Add Another Visit**        | Same country, different dates   | Append a new `NewVisitDraft` for current `countryId`; save as `country_visit_details` + `visit_family_members`. |
| **+ Add Another Country To Trip** | Same trip, different country  | Navigate to Trip Wizard with current country pre-filled as leg 1 and one empty leg 2 (user picks country and dates). Creates/extends a trip with `trip_legs`. |

### State flow for family pre-selection
```
useFamilyData() → countries[].visitedBy (names), familyMembers[]
       ↓
CountryTracker maps country.visitedBy → member IDs for that country
       ↓
CountryVisitDetailsDialog(initialFamilyMemberIds)
       ↓
createNewVisitDraft(initialFamilyMemberIds) → new draft with familyMemberIds pre-filled
```

---

## 4. IMPLEMENTATION SUMMARY

1. **CountryTracker**: Compute `initialFamilyMemberIds` from `country.visitedBy` and `familyMembers`; pass to `CountryVisitDetailsDialog`.
2. **CountryVisitDetailsDialog**:
   - Add prop `initialFamilyMemberIds?: string[]`.
   - Use it in `createNewVisitDraft(initialFamilyMemberIds)` so new visit drafts get pre-selected members.
   - Add button "+ Add Another Country To Trip" that navigates to `/trips/new?fromCountryId=...&fromCountryName=...`.
3. **TripWizard** (or route): Read `fromCountryId` / `fromCountryName` from query; pre-fill `formData.legs` with one leg (that country) and one empty leg so the user is clearly "adding another country to a trip".
