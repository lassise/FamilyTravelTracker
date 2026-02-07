# Onboarding Flow - 50 Point UX Test Expectations

## Test Date: 2026-02-07
## Tester: AI Agent
## Browser: Chrome/Edge

---

## Navigation & Flow (1-10)
1. [ ] `/onboarding` route loads without errors
2. [ ] Progress bar shows current step position (e.g., "Step 1 of 6")
3. [ ] Progress bar fills proportionally as user advances
4. [ ] "Back" button works and returns to previous step
5. [ ] "Back" button is disabled/hidden on first step
6. [ ] "Next" button advances to next step
7. [ ] "Skip for now" button is visible on appropriate steps
8. [ ] Final step shows "Get Started" instead of "Next"
9. [ ] Completing onboarding redirects to main app
10. [ ] Cannot access onboarding again after completion

## Welcome Screen (11-15)
11. [ ] Welcome screen displays app name/branding
12. [ ] Welcome screen has engaging copy
13. [ ] Welcome screen shows key feature highlights
14. [ ] Welcome screen has attractive visual design
15. [ ] "Get Started" button initiates the flow

## Name Input Step (16-20)
16. [ ] Name input field is auto-focused
17. [ ] Name field has placeholder text
18. [ ] Name validation prevents empty submission
19. [ ] Name saves to database after proceeding
20. [ ] Name pre-fills family member step if provided

## Family Members Step (21-30)
21. [ ] Can add multiple family members
22. [ ] Each member shows unique avatar emoji
23. [ ] Each member has distinctive color
24. [ ] "Quick Add Spouse" buttons appear after first member
25. [ ] Quick add creates member with single click
26. [ ] Age/Role dropdown displays all options (Adult, Teen, Child 6-12, Child 3-5, Toddler, Infant)
27. [ ] Age/Role saves to database correctly
28. [ ] Visual "KID" badge appears on children/toddlers/infants
29. [ ] Can remove family members with X button
30. [ ] Solo traveler mode is detected and indicated

## Home Country & Airport Step (31-40)
31. [ ] Country search/dropdown is searchable
32. [ ] Country flags display correctly
33. [ ] Selected country shows confirmation
34. [ ] Home airport search accepts city names
35. [ ] Home airport search accepts airport codes (e.g., "JFK")
36. [ ] Airport search shows results dropdown
37. [ ] Selected airport displays with code, city, country
38. [ ] Airport has "Primary" badge
39. [ ] Can clear/change selected airport
40. [ ] Both country and airport save to database

## Countries Visited Step (41-45)
41. [ ] Country checklist is searchable
42. [ ] Can select multiple countries
43. [ ] Family member attribution works (checkboxes for who visited)
44. [ ] Solo mode auto-attributes to single traveler
45. [ ] Added countries display in "Added" section with count

## Travel Preferences Step (46-50)
46. [ ] Budget preference selection (Budget/Standard/Luxury) works
47. [ ] Pace preference selection (Relaxed/Balanced/Fast) works
48. [ ] Interest tags are selectable/toggleable
49. [ ] Accommodation types are multi-selectable
50. [ ] Flight class selector works (Economy/Premium/Business/First)

## BONUS: New Features (51-60)
51. [ ] Airline alliance badges toggle correctly (Star Alliance/SkyTeam/OneWorld)
52. [ ] Dietary restrictions input accepts text
53. [ ] Dietary restrictions preserves comma-separated values
54. [ ] Stroller accessibility badge toggles
55. [ ] Wheelchair accessibility badge toggles
56. [ ] All preferences save to database
57. [ ] Loading states show during saves
58. [ ] Error messages display for failed saves
59. [ ] Success toasts confirm actions
60. [ ] Overall visual polish and animations work smoothly

---

## Post-Completion Verification
- [ ] `onboarding_completed` flag set to true in database
- [ ] User redirected to `/` (dashboard)
- [ ] Cannot revisit `/onboarding` (auto-redirects)
- [ ] All data persisted correctly in Supabase tables
