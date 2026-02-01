# AI Find On My Phone — Step-by-step implementation

This doc details how to implement the "AI Find On My Phone" feature as a **side option** next to Add Countries (not in onboarding first). Entry point: a button **"AI Find On My Phone"** beside "Quick Add Country" and "Add Country with Details".

---

## Entry point

- **Where**: [src/components/CountryTracker.tsx](src/components/CountryTracker.tsx), in the same `flex flex-wrap items-center justify-center gap-2` div that contains `CountryDialog` and `AddCountryWithDetailsDialog`.
- **What**: Add a third button: **"AI Find On My Phone"** (e.g. `variant="outline"`, icon: Smartphone or Sparkles). Click opens a dialog that hosts: paste text, upload photos, then list of suggested trips (Edit / Add to travels / Dismiss).
- **Optional**: Expose the same flow from [TravelHistory](src/pages/TravelHistory.tsx) (e.g. link or card under Countries tab) so it’s discoverable there too.

---

## Step 1: Button and dialog shell

1. **New component**: `src/components/travel/AIFindOnMyPhoneDialog.tsx`
   - **Props**: `open`, `onOpenChange`, `familyMembers`, `onSuccess` (callback so parent can refetch). Use `useHomeCountry(homeCountry)` inside for `homeCountryIso2` (or receive `homeCountryIso2` from parent).
   - **UI**: `Dialog` (or `Sheet` on mobile via `useMobile`) with:
     - Title: "AI Find On My Phone"
     - Short copy: "Paste text (OOO, boarding pass) or add photos with location to suggest trips. We only suggest photos taken **outside your home country**."
     - **Paste**: `<textarea placeholder="e.g. I'll be OOO in Iceland from 3/25/13 to 3/30/13">` + button "Find trips".
     - **Photos**: `<input type="file" accept="image/*" multiple />` + label "Add photos with location".
     - (Later) Area for suggested trips list; start with empty state.
   - No parsing or state for suggestions yet; just layout and local state for `open` and textarea value.
2. **CountryTracker**:
   - Import `AIFindOnMyPhoneDialog`.
   - Add state: `const [aiFindDialogOpen, setAiFindDialogOpen] = useState(false)`.
   - In the button row (same div as CountryDialog and AddCountryWithDetailsDialog), add:
     - `<Button variant="outline" onClick={() => setAiFindDialogOpen(true)}><Smartphone className="w-4 h-4 mr-2" /> AI Find On My Phone</Button>` (use `Smartphone` or `Sparkles` from lucide-react).
   - Render: `<AIFindOnMyPhoneDialog open={aiFindDialogOpen} onOpenChange={setAiFindDialogOpen} familyMembers={familyMembers} onSuccess={handleUpdate} />`.
   - Get home country: pass `homeCountry` from profile (e.g. from a hook that reads `profiles.home_country`) or let the dialog use `useHomeCountry` with the same source.
3. **Check**: Button appears next to the two Add Country buttons; clicking opens the dialog with paste area and photo input.

---

## Step 2: Paste parser — extract trips from text

1. **New file**: `src/lib/tripSuggestionsParser.ts`
   - **Type** (export): `TripSuggestion` with: `id: string`, `countryName: string`, `countryCode?: string`, `visitDate: string | null`, `endDate: string | null`, `approximateMonth: number | null`, `approximateYear: number | null`, `tripName: string | null`, `sourceType: 'pasted_text' | 'photo_exif'`, `sourceLabel: string`, optional `photoCount?: number`, `photoFileNames?: string[]`.
   - **Function**: `parsePastedText(text: string): TripSuggestion[]`
     - **Dates**: Regexes for formats like `3/25/13`–`3/30/13`, `Mar 25, 2013`, `2013-03-25`, `25.03.2013`. Use `date-fns` (`parse`, `parseISO`) with try/catch; normalize to `YYYY-MM-DD` for `visitDate`/`endDate`. If only year or month+year, set `approximateYear`/`approximateMonth` and leave `visitDate`/`endDate` null.
     - **Countries**: Match against [getAllCountries()](src/lib/countriesData.ts) names and aliases (Iceland, UK, USA, etc.). Resolve to canonical name and code. Emit one suggestion per (country, date range); if multiple ranges for same country, emit multiple suggestions.
     - Generate `id` per suggestion (e.g. `paste_${Date.now()}_${i}` or `crypto.randomUUID()`). Set `sourceType: 'pasted_text'`, `sourceLabel: 'From pasted text'`.
   - Return array of `TripSuggestion`.
2. **AIFindOnMyPhoneDialog**:
   - State: `const [suggestions, setSuggestions] = useState<TripSuggestion[]>([])`.
   - On "Find trips" click: `const parsed = parsePastedText(textareaValue); setSuggestions(prev => [...prev, ...parsed])`.
   - Render a **suggested trips list**: map `suggestions` to cards. Each card: country name + flag (CountryFlag with `countryCode`), date range (or "Approximate: Month Year"), source badge "From pasted text". Buttons: for now only **Dismiss** (remove by `id` from state). Placeholder for "Add to travels" (Step 5).
3. **Check**: Paste "I'll be OOO in Iceland from 3/25/13 to 3/30/13" → one suggestion (Iceland, 2013-03-25–2013-03-30, "From pasted text"). Dismiss removes it.

---

## Step 3: Suggested trips list UI (Edit + Dismiss)

1. **List**: Each suggestion card shows: country (name + flag), date range or approximate, source label, and three actions: **Edit**, **Add to travels**, **Dismiss**.
2. **Edit**:
   - Click Edit opens a modal (or inline form) with:
     - Country: combobox search/select (same as [AddCountryWithDetailsDialog](src/components/AddCountryWithDetailsDialog.tsx) — use getAllCountries(), Command/Popover).
     - Dates: [TravelDatePicker](src/components/TravelDatePicker.tsx) or two date inputs; or approximate month/year selects.
     - Optional trip name input.
   - On save: update the suggestion in `suggestions` (find by `id`, replace with edited values). Close modal.
3. **Dismiss**: Remove suggestion from `suggestions` (filter out by `id`).
4. **Check**: Edit opens form and updates card; Dismiss removes card.

---

## Step 4: Photo EXIF + reverse geocode + home-country filter

1. **Dependency**: Add `exifr` for EXIF: `npm install exifr`. For reverse geocode: use OpenStreetMap Nominatim (free, rate-limited) or a small client-side country-in-polygon dataset.
2. **New file**: `src/lib/photoTripSuggestions.ts` (or extend `tripSuggestionsParser.ts`)
   - **Function**: `async getSuggestionsFromPhotos(files: File[], homeCountryIso2: string | null): Promise<TripSuggestion[]>`
     - For each file: `exifr.gps(file)` and `exifr.datetime(file)` (or parse EXIF). If no GPS or no date, skip (or push low-confidence suggestion with date only).
     - Reverse-geocode (lat, lon) to country (Nominatim returns country code; map to name via countriesData). If `countryCode === homeCountryIso2`, **skip** (filter out home country).
     - **Group** by (country, month+year) or (country, date): multiple photos in same country/month → one suggestion with `photoCount`, date range = min–max date, `sourceLabel: "From N photos in [Country]"`. Otherwise one suggestion per photo with `sourceLabel: "From photo filename"`.
     - Generate `id`s (e.g. `photo_${file.name}_${i}`). `sourceType: 'photo_exif'`.
   - Return array of `TripSuggestion`.
3. **AIFindOnMyPhoneDialog**:
   - On file input change: get `FileList`, call `getSuggestionsFromPhotos(Array.from(files), homeCountryIso2)`. Show loading ("Reading photos…"). Then `setSuggestions(prev => [...prev, ...result])`.
   - If user has no home country set: show message "Set your home country in Settings so we can show only photos taken abroad" and still run parser but optionally skip filter or show all (document behavior).
4. **Check**: Photo with EXIF in France (home = US) → one suggestion. Photo in US (home = US) → no suggestion.

---

## Step 5: "Add to travels" — create country + visit

1. **Resolve country**: When user clicks **Add to travels** on a suggestion:
   - Check if user already has a country with same name/code (use parent’s `countries` or fetch). If not, **create country**: `supabase.from('countries').insert({ name, flag: countryCode, continent, user_id }).select().single()` (same as [CountryDialog](src/components/CountryDialog.tsx)).
   - Get `country_id` (new or existing).
2. **Family members**: Default to all `familyMembers` (or first). Optionally open a small modal to pick "Who went?" (checkboxes) before calling RPC.
3. **RPC**: `supabase.rpc('insert_country_visit_detail', { p_country_id: country_id, p_trip_name: suggestion.tripName ?? null, p_visit_date: suggestion.visitDate, p_end_date: suggestion.endDate, p_number_of_days: computed from dates or null, p_is_approximate: !!suggestion.approximateYear, p_approximate_month: suggestion.approximateMonth, p_approximate_year: suggestion.approximateYear, p_family_member_ids: selectedMemberIds, p_cities: null })`.
4. **On success**: Remove this suggestion from `suggestions` (filter by `id`). Call `onSuccess()`. Toast "Trip added!".
5. **On error**: Toast error; leave suggestion in list so user can Edit and retry.
6. **Check**: Add to travels creates country (if new) and visit; parent refetches; suggestion disappears; new visit appears in Countries list.

---

## Step 6: Home country wiring

1. **Source of home country**: [useHomeCountry](src/hooks/useHomeCountry.ts) takes `homeCountry` (from profile/settings). Use it in CountryTracker or in the dialog: resolve to `iso2` and pass as `homeCountryIso2` to the dialog (or use `useHomeCountry` inside the dialog if it has access to the same profile).
2. **Copy**: In the dialog, if home country is set: "We only suggest photos taken **outside your home country**." If not set: "Set your home country in Settings to filter photos by trips abroad."
3. **Check**: With home = US, US photos are filtered out; non-US photos produce suggestions.

---

## Step 7: Polish and mobile

1. **Mobile layout**: Use a full-screen or large sheet on small screens (e.g. [Vaul](src/components/ui/vaul) or Dialog with `className` for max height and scroll). File input on mobile opens camera/gallery.
2. **Empty states**: No suggestions yet → only paste + photo UI. After parse with zero results → "No trips found in that text" / "No photos with location/date found."
3. **Accessibility**: Labels for textarea and file input; focus trap in dialog.

---

## Implementation order (summary)

| Step | What |
|------|------|
| 1 | Button "AI Find On My Phone" in CountryTracker + dialog shell (paste + photo input, no logic). |
| 2 | `tripSuggestionsParser.ts` + parse on "Find trips" + suggestions state + list with Dismiss only. |
| 3 | List UI: Edit modal + Dismiss; Add to travels still placeholder. |
| 4 | `photoTripSuggestions.ts` (exifr + geocode + home filter) + merge into suggestions. |
| 5 | Add to travels: create country + insert_country_visit_detail + onSuccess + remove suggestion. |
| 6 | Wire home country (useHomeCountry) in dialog; copy and filter. |
| 7 | Mobile layout (sheet), empty states, a11y. |

Later (optional): Persist suggestions in `localStorage` or add `trip_suggestions` table for cross-device.
