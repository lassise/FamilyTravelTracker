# Onboarding Flow - Issue Analysis & Fix Plan

## 🔍 Code Review Analysis (Without Browser Testing)

Based on code inspection and common UX patterns, here are the predicted issues:

---

## ❌ CRITICAL ISSUES (Must Fix)

### 1. **Missing Import in HomeCountryStep.tsx**
**Issue**: `searchAirports` might not be exported from `@/lib/airportsData`
**File**: `src/components/onboarding/HomeCountryStep.tsx:20`
**Fix**: Verify export exists in airportsData.ts

### 2. **TypeScript Errors on Alliances**
**Issue**: `preferred_alliances` type mismatch in TravelPreferencesStep
**File**: `src/components/onboarding/TravelPreferencesStep.tsx`
**Fix**: Ensure Supabase types include `preferred_alliances: string[] | null`

### 3. **OnboardingWizard Missing New Steps**
**Issue**: OnboardingWizard.tsx might not be rendering the updated components
**File**: Need to verify step definitions include new features

### 4. **Database Null Handling**
**Issue**: `flightData?.preferred_alliances` might be null on first load
**File**: `src/components/onboarding/TravelPreferencesStep.tsx:130`
**Fix**: Add `|| []` fallback

---

## ⚠️ HIGH PRIORITY UX ISSUES

### 5. **Airport Search Empty State**
**Location**: HomeCountryStep.tsx
**Issue**: No "No results found" message when search returns empty
**Impact**: User confusion when typing invalid codes

### 6. **Loading States Missing**
**Location**: All steps
**Issue**: No spinner/disabled state during Supabase saves
**Impact**: Users might click multiple times

### 7. **Toast Feedback Inconsistent**
**Location**: FamilyMembersStep, HomeCountryStep
**Issue**: Some actions don't show success toasts
**Impact**: Unclear if data saved

### 8. **Age Dropdown Default**
**Location**: FamilyMembersStep.tsx:newRole state
**Issue**: Defaults to "Adult" - should show placeholder "Select..."
**Impact**: Might accidentally save wrong age

---

## 🎨 MEDIUM PRIORITY UX POLISH

### 9. **Dietary Input UX**
**Issue**: Plain text input instead of tag-based chips
**Better**: Individual badges that can be removed individually

### 10. **Airport Clear Button**
**Issue**: X button might be too small on mobile
**Suggestion**: Add "Change Airport" text button

### 11. **Progress Bar Animation**
**Issue**: Might jump between steps instead of smooth transition
**Better**: Animated width transition

### 12. **Mobile Responsiveness**
**Issue**: Alliance badges might wrap poorly on small screens
**Better**: Horizontal scroll or 2-column grid

---

## 🐛 LOW PRIORITY / EDGE CASES

### 13. **Accessibility: Focus Management**
**Issue**: Focus doesn't auto-move to next input after selection
**Better**: Auto-focus next field after country/airport select

### 14. **Keyboard Navigation**
**Issue**: Can't use Enter key to select from airport dropdown
**Better**: Add keyboard event handlers

### 15. **Data Persistence on Refresh**
**Issue**: Refreshing page might lose in-progress data
**Better**: Save to localStorage as draft

---

## 🔧 TECHNICAL DEBT

### 16. **Data Duplication**
**Issue**: home_airports saved to BOTH profiles AND flight_preferences
**Impact**: Potential desync
**Better**: Single source of truth

### 17. **Diet/Access Not Persisted**
**Issue**: Only stored in component state
**Impact**: Lost on logout/device change
**Better**: Need DB migration or use custom_preferences JSON

### 18. **Type Safety**
**Issue**: Manual type assertions with `as any`
**Better**: Proper Zod schemas or type guards

---

## 📋 IMMEDIATE ACTION PLAN (Next 30 mins)

1. ✅ Verify airportsData export exists
2. ✅ Add null safety to alliance state
3. ✅ Add "No results" placeholder to airport search
4. ✅ Add loading state to HomeCountryStep save
5. ✅ Add success toast after airport selection
6. ✅ Fix age dropdown to show "Select..." placeholder
7. ✅ Add disabled state to buttons during saves
8. 📊 Test in actual browser (manual or fix environment)

---

## 🎯 POST-TESTING PRIORITIES

After browser testing confirms issues:
- Fix any console errors
- Smooth transitions between steps
- Ensure all data persists correctly
- Mobile responsive testing
- Accessibility audit
