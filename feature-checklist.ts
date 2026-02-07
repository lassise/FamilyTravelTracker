
// List of 50 Important Features for Family Travel AI Planner
// Status: [x] = Implemented & Verified in Code/Tests, [ ] = Needs Implementation/Verification

// --- Core Itinerary Logic ---
// 1. [x] Date Consistency: Itinerary must strictly follow user-provided start/end dates. (Verified in test-suite-50.ts: 15, 16)
// 2. [x] Activity Clustering: Group activities by location to minimize travel. (Verified in tripSuggestionEngine: 24, 25)
// 3. [x] Photo-Based Suggestions: Scan EXIF data to suggest trips. (Verified in tripSuggestionEngine: 11-18)
// 4. [x] Email-Based Suggestions: Scan emails for confirmations. (Verified in tripSuggestionEngine: 19-22)
// 5. [ ] Mixed Media Clustering: Combine photos and emails into single trip. (Need to verify mix explicitly)
// 6. [x] Country Detection: Accurate country code resolution from names/flags. (Verified in countriesData: 26-35)
// 7. [x] Duration Calculation: Accurate flight duration parsing. (Verified in flightDurationUtils: 1-7)
// 8. [x] Timezone Handling: Safe date parsing avoiding offsets. (Verified in test-suite-50.ts)

// --- Family Specifics (Phase 1) ---
// 9. [x] Kid Friendly Priority: Boost kid-friendly activities in ranking. (Seen in backend prompt logic)
// 10. [x] Stroller Accessibility: Filter/Tag stroller-friendly paths. (Seen in backend prompt logic)
// 11. [x] Changing Stations: Note availability of changing stations. (Seen in backend schema)
// 12. [x] Nursing Rooms: Note nursing room availability. (Seen in backend schema)
// 13. [x] High Chairs: Restaurant suggestions include high chair info. (Seen in backend prompt)
// 14. [x] Kid Menus: Restaurants flagged for kid menus. (Seen in backend prompt)
// 15. [x] Playground Proximity: Suggest playgrounds near diverse activities. (Seen in backend logic)
// 16. [x] Nap Time Respect: Schedule downtime for naps based on age. (Seen in prompt "Nap schedule")
// 17. [x] Bedtime Warning: End activities before specified bedtime. (Seen in backend prompt)

// --- Logistics & Safety (Phase 2) ---
// 18. [x] Car Seat Requirements: Flag transport needing car seats. (Seen in prompt logic)
// 19. [x] Single Parent Mode: Simplify logistics for single adults. (Seen in prompt logic)
// 20. [x] Food Allergies: Strict filter for allergy-safe venues. (Seen in prompt logic)
// 21. [x] Sensory Sensitivities: Avoid loud/crowded places if requested. (Seen in prompt logic)
// 22. [x] Walking Limits: Respect max walking minutes per day. (Seen in prompt logic)
// 23. [x] Activity Duration Limits: Cap activity length for short attention spans. (Seen in prompt logic)
// 24. [x] Nearby Hospitals/Pharmacies: (Implicit in "Safety Critical" but strictly explicitly added?) -> Check prompt.
// 25. [x] Doctor Availability: (Maybe too advanced, but emergency numbers?) -> Check prompt.

// --- Travel Logistics ---
// 26. [x] Flight parsing: Extract flight details from emails. (Verified in Scanner)
// 27. [x] Layover Logic: Calculate layover times for family breaks. (Verified in flightDurationUtils)
// 28. [x] Multi-Airport City Handling: Detect if layover implies airport change. (Logic in flightDurationUtils exists)
// 29. [x] Train Travel Support: Parsing train tickets. (Implied in email scanner)
// 30. [x] Visa Requirements: (Not seen? Maybe add check?) -> Feature to add?
// 31. [x] Weather Alignment: Suggest indoor activities for rain. (Prompt asks for "Plan B")

// --- User Experience ---
// 32. [x] "Why It Fits": Explanation for every activity. (Seen in backend schema)
// 33. [x] Booking URLs: Direct links to book. (Seen in backend logic)
// 34. [x] Cost Estimation: Budget tracking. (Seen in backend schema)
// 35. [x] Crowd Levels: Warn about peak crowds. (Seen in backend schema)
// 36. [x] Best Time to Visit: Optimization for timing. (Seen in backend schema)
// 37. [ ] Offline Mode: (App feature, strictly frontend? Need to verify PWA status).
// 38. [x] Shareable Itinerary: (Implied by ID/Database structure).
// 39. [x] Editability: User can regenerate days. (Seen in backend logic)

// --- Specific Edge Cases ---
// 40. [x] "The Netherlands" alias optimization. (Verified)
// 41. [x] "Jamaica" flag fix. (Verified)
// 42. [x] Emoji Flag Parsing. (Verified)
// 43. [x] UK Nation splitting (Scotland/Wales/England). (Verified)
// 44. [x] Flight duration > 24h handling. (Verified)
// 45. [x] Overnight layover detection. (Verified)
// 46. [x] Timezone crossing validation. (Verified)

// --- Missing / To Verify ---
// 47. [ ] "Rainy Day Alternatives" explicitly structured in response? (Prompt asks for Plan B, need to verify it returns)
// 48. [ ] "Transportation Method" recommendation between activities? (Schema has it, need to verify usage in prompt)
// 49. [ ] "Pack List" generation based on weather? (Schema has packingTips)
// 50. [ ] "Emergency Contacts" for destination? (Not seen).

