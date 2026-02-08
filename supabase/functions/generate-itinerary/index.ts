/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 60;

// Retry configuration
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;

// Generate a request ID for tracing
const generateRequestId = () => crypto.randomUUID().substring(0, 8);

// Italy station data for multi-station warnings
const ITALY_MULTI_STATION_CITIES: Record<string, { stations: string[]; guidance: string }> = {
  'milan': {
    stations: ['Milano Centrale', 'Milano Porta Garibaldi', 'Milano Rogoredo', 'Milano Cadorna'],
    guidance: 'Milano Centrale is the main hub for high-speed trains. Porta Garibaldi is closer to the city center and serves some high-speed routes. Rogoredo is convenient if staying in the south.'
  },
  'rome': {
    stations: ['Roma Termini', 'Roma Tiburtina', 'Roma Ostiense'],
    guidance: 'Roma Termini is the main station in the city center. Tiburtina serves some high-speed trains and is closer to the northeast. Ostiense connects to Fiumicino airport.'
  },
  'florence': {
    stations: ['Firenze Santa Maria Novella', 'Firenze Campo di Marte', 'Firenze Rifredi'],
    guidance: 'Santa Maria Novella (SMN) is the main central station. Campo di Marte serves some regional trains and is near the stadium.'
  },
  'naples': {
    stations: ['Napoli Centrale', 'Napoli Afragola', 'Napoli Piazza Garibaldi'],
    guidance: 'Napoli Centrale is downtown. Afragola is a modern high-speed station outside the city, convenient for some routes but requires transfer.'
  },
  'venice': {
    stations: ['Venezia Santa Lucia', 'Venezia Mestre'],
    guidance: 'Santa Lucia is ON the island (no cars allowed beyond). Mestre is on the mainland - you\'ll need a short train/bus to reach Venice island from there.'
  },
  'bologna': {
    stations: ['Bologna Centrale', 'Bologna AV Mediopadana'],
    guidance: 'Bologna Centrale is the main station. The AV station is for high-speed connections between Milan and Rome.'
  }
};

// Input validation schema
const TripDetailsSchema = z.object({
  destination: z.string().trim().min(1, "Destination is required").max(100, "Destination too long"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  kidsAges: z.array(z.number().int().min(0).max(18)).max(10, "Too many kids"),
  interests: z.array(z.string().trim().min(1).max(100)).max(30, "Too many interests"),
  pacePreference: z.string().trim().max(50),
  budgetLevel: z.string().trim().max(50),
  lodgingLocation: z.string().trim().max(200).optional(),
  napSchedule: z.string().trim().max(200).optional(),
  strollerNeeds: z.boolean().optional(),
  tripPurpose: z.enum(["leisure", "business", "mixed"]).optional().default("leisure"),
  hasKids: z.boolean().optional().default(false),
  plannerMode: z.enum(["personal", "planner"]).optional().default("personal"),
  extraContext: z.string().trim().max(2000).optional(),
  hasLodgingBooked: z.boolean().optional().default(false),
  providerPreferences: z.array(z.string()).optional().default(['any']),
  // Accessibility preferences
  needsWheelchairAccess: z.boolean().optional().default(false),
  hasStroller: z.boolean().optional().default(false),
  clientInfo: z.object({
    numAdults: z.number().int().min(1).max(20),
    numKids: z.number().int().min(0).max(15),
    kidsAges: z.array(z.number().int().min(0).max(18)),
    homeAirport: z.string().max(10),
    budgetRange: z.enum(["budget", "moderate", "luxury"]),
    profileId: z.string().nullable(),
  }).nullable().optional(),
  profilePreferences: z.object({
    pace: z.string().optional(),
    budgetLevel: z.string().optional(),
    kidFriendlyPriority: z.string().optional(),
    preferNonstop: z.boolean().optional(),
    maxStops: z.number().optional(),
  }).nullable().optional(),
  regenerateDayNumber: z.number().int().min(1).max(30).optional(),
  // Phase 1: Critical family needs
  foodAllergies: z.array(z.string()).optional().default([]),
  sensorySensitivities: z.array(z.string()).optional().default([]),
  bedtime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxWalkingMinutes: z.number().int().min(0).max(180).optional(),
  maxActivityMinutes: z.number().int().min(0).max(480).optional(),
  // Phase 2: Logistics & Equipment
  carSeatNeeds: z.string().optional(),
  flightTimePreference: z.string().optional(),
  accommodationNeeds: z.array(z.string()).optional().default([]),
  isSingleParent: z.boolean().optional().default(false),
  kidHeightsInches: z.array(z.number()).optional().default([]),
  isFlexibleDates: z.boolean().optional().default(false),
  preferredSeason: z.string().nullable().optional(),
  tripLegs: z.array(z.object({
    country_name: z.string(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    cities: z.array(z.string()).optional(),
    duration_days: z.number().optional(),
    order: z.number(),
  })).optional().default([]),
});

// Enhanced activity schema with booking, seasonal, and accessibility info
const ActivitySchema = z.object({
  timeSlot: z.enum(["morning", "afternoon", "evening"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  locationName: z.string().max(200).optional(),
  locationAddress: z.string().max(300).optional(),
  category: z.string().max(50).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  costEstimate: z.number().min(0).optional(),
  isKidFriendly: z.boolean().optional(),
  isStrollerFriendly: z.boolean().optional(),
  requiresReservation: z.boolean().optional(),
  reservationInfo: z.string().max(500).optional(),
  transitMode: z.string().max(50).optional(),
  accessibilityTags: z.array(z.string()).optional(),
  strollerNotes: z.string().max(300).optional(),
  // Booking and rating fields
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  bookingUrl: z.string().max(500).optional(),
  providerType: z.enum(['local_tour', 'airbnb_experience', 'viator', 'getyourguide', 'restaurant', 'attraction', 'transport', 'hotel', 'other']).optional(),
  whyItFits: z.string().max(300).optional(),
  // Seasonal and crowd info
  bestTimeToVisit: z.string().max(200).optional(),
  crowdLevel: z.enum(['low', 'moderate', 'high', 'peak']).optional(),
  seasonalNotes: z.string().max(300).optional(),
  // Transport details
  transportMode: z.enum(['walk', 'taxi', 'metro', 'bus', 'train', 'ferry', 'car', 'bike', 'other']).optional(),
  transportBookingUrl: z.string().max(500).optional(),
  transportStationNotes: z.string().max(500).optional(),
  // Coordinates
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Distance and travel info (new fields)
  distanceFromPrevious: z.number().optional(),
  distanceUnit: z.enum(['km', 'miles']).optional(),
  travelTimeMinutes: z.number().int().min(0).optional(),
  recommendedTransitMode: z.enum(['walk', 'taxi', 'metro', 'bus', 'train', 'ferry', 'car', 'bike', 'rideshare']).optional(),
  transitDetails: z.string().max(300).optional(),
  // Accessibility info (new fields)
  isWheelchairAccessible: z.boolean().optional(),
  accessibilityNotes: z.string().max(300).optional(),
});

const MealSuggestionSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  kidFriendlyNotes: z.string().max(300).optional(),
  rating: z.number().min(0).max(5).optional(),
  bookingUrl: z.string().max(500).optional(),
});

// Train segment schema
const TrainSegmentSchema = z.object({
  originCity: z.string().max(100),
  originStation: z.string().max(100),
  originStationAlternatives: z.array(z.string()).optional(),
  destinationCity: z.string().max(100),
  destinationStation: z.string().max(100),
  destinationStationAlternatives: z.array(z.string()).optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  durationMinutes: z.number().int().optional(),
  trainType: z.string().optional(),
  bookingUrl: z.string().max(500).optional(),
  priceEstimate: z.number().optional(),
  stationGuidance: z.string().max(500).optional(),
  stationWarning: z.string().max(500).optional(),
});

// Lodging suggestion schema
const LodgingSuggestionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  lodgingType: z.enum(['hotel', 'vacation_rental', 'hostel', 'apartment', 'other']).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  pricePerNight: z.number().optional(),
  bookingUrl: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  amenities: z.array(z.string()).optional(),
  isKidFriendly: z.boolean().optional(),
  distanceFromCenter: z.string().max(100).optional(),
  whyRecommended: z.string().max(300).optional(),
});

const DaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(200),
  weather_notes: z.string().max(500).optional(),
  activities: z.array(ActivitySchema).min(1).max(15),
  mealSuggestions: z.array(MealSuggestionSchema).optional(),
  planB: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  trainSegments: z.array(TrainSegmentSchema).optional(),
});

const ItinerarySchema = z.object({
  tripSummary: z.string().max(1000).optional(),
  days: z.array(DaySchema).min(1).max(30),
  packingTips: z.array(z.string().max(200)).optional(),
  generalTips: z.array(z.string().max(200)).optional(),
  lodgingSuggestions: z.array(LodgingSuggestionSchema).optional(),
  trainBookingTips: z.string().max(500).optional(),
});

type TripDetails = z.infer<typeof TripDetailsSchema>;

interface RateLimitRecord {
  id: string;
  user_id: string;
  function_name: string;
  request_count: number;
  window_start: string;
  created_at: string;
}

interface LogContext {
  requestId: string;
  userId: string;
  step: string;
  destination?: string;
  payloadSize?: number;
  dayNumber?: number;
}

// Structured logging helper
const log = (level: 'info' | 'warn' | 'error', message: string, context: LogContext, extra?: Record<string, unknown>) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...extra,
  };
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
};

const sanitizeForPrompt = (text: string): string => {
  return text
    .replace(/[\n\r]/g, ' ')
    .replace(/[<>]/g, '')
    .substring(0, 500)
    .trim();
};

const checkRateLimit = async (
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> => {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  try {
    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('function_name', functionName)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { allowed: true };
    }

    const record = data as RateLimitRecord | null;

    if (!record) {
      await supabase.from('api_rate_limits').insert({
        user_id: userId,
        function_name: functionName,
        request_count: 1,
        window_start: new Date().toISOString()
      } as RateLimitRecord);
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const recordWindowStart = new Date(record.window_start);
    if (recordWindowStart < windowStart) {
      await supabase
        .from('api_rate_limits')
        .update({
          request_count: 1,
          window_start: new Date().toISOString()
        } as Partial<RateLimitRecord>)
        .eq('id', record.id);
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.request_count >= maxRequests) {
      const resetTime = new Date(record.window_start).getTime() + windowMinutes * 60 * 1000;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return { allowed: false, retryAfter, remaining: 0 };
    }

    await supabase
      .from('api_rate_limits')
      .update({ request_count: record.request_count + 1 } as Partial<RateLimitRecord>)
      .eq('id', record.id);

    return { allowed: true, remaining: maxRequests - record.request_count - 1 };
  } catch {
    return { allowed: true };
  }
};

// Retry with exponential backoff
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  logCtx: LogContext,
  maxRetries = MAX_RETRIES
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          log('warn', `Retrying after ${backoffMs}ms (attempt ${attempt + 1})`, logCtx, {
            status: response.status
          });
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        log('warn', `Network error, retrying after ${backoffMs}ms`, logCtx, {
          error: lastError.message
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
};

// Calculate exact dates for each day based on user's start date
const calculateDayDates = (startDate: string, numDays: number): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < numDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
};

// Detect Italy multi-station cities in destination
const detectItalyStationWarnings = (destination: string): { city: string; info: typeof ITALY_MULTI_STATION_CITIES[string] }[] => {
  const warnings: { city: string; info: typeof ITALY_MULTI_STATION_CITIES[string] }[] = [];
  const destLower = destination.toLowerCase();

  // Check if destination is in Italy or mentions Italian cities
  const isItaly = destLower.includes('italy') || destLower.includes('italia');

  for (const [city, info] of Object.entries(ITALY_MULTI_STATION_CITIES)) {
    if (destLower.includes(city) || isItaly) {
      warnings.push({ city: city.charAt(0).toUpperCase() + city.slice(1), info });
    }
  }

  return warnings;
};

// Generate affiliate booking URLs
const generateBookingUrl = (type: string, name: string, destination: string, date?: string): string => {
  const encodedName = encodeURIComponent(name);
  const encodedDest = encodeURIComponent(destination);
  const dateParam = date ? `&date=${date}` : '';

  switch (type) {
    case 'local_tour':
    case 'viator':
      return `https://www.viator.com/searchResults/all?text=${encodedName}+${encodedDest}${dateParam}`;
    case 'airbnb_experience':
      return `https://www.airbnb.com/s/experiences?query=${encodedName}+${encodedDest}`;
    case 'getyourguide':
      return `https://www.getyourguide.com/s/?q=${encodedName}+${encodedDest}`;
    case 'restaurant':
      return `https://www.tripadvisor.com/Search?q=${encodedName}+${encodedDest}`;
    case 'hotel':
      return `https://www.booking.com/searchresults.html?ss=${encodedName}+${encodedDest}`;
    case 'train':
      return `https://www.thetrainline.com/book/results?origin=${encodedDest}`;
    default:
      return `https://www.google.com/search?q=${encodedName}+${encodedDest}+booking`;
  }
};

// Validate and repair itinerary to match schema
const validateAndRepairItinerary = async (
  itinerary: unknown,
  tripDetails: TripDetails,
  tripDays: number,
  dayDates: string[],
  logCtx: LogContext,
  apiKey: string
): Promise<{ itinerary: z.infer<typeof ItinerarySchema>; wasRepaired: boolean }> => {

  // First, enforce date integrity - ALWAYS use user's dates
  if (itinerary && typeof itinerary === 'object' && 'days' in itinerary) {
    const it = itinerary as { days: Array<{ dayNumber: number; date?: string; activities?: Array<any> }> };
    for (const day of it.days) {
      const dayIndex = day.dayNumber - 1;
      if (dayIndex >= 0 && dayIndex < dayDates.length) {
        day.date = dayDates[dayIndex];
      }

      // Add booking URLs to activities if missing
      if (day.activities) {
        for (const activity of day.activities) {
          if (!activity.bookingUrl && activity.title) {
            const providerType = activity.providerType || 'attraction';
            activity.bookingUrl = generateBookingUrl(providerType, activity.title, tripDetails.destination, day.date);
          }
        }
      }
    }
  }

  const validationResult = ItinerarySchema.safeParse(itinerary);

  if (validationResult.success) {
    log('info', 'Itinerary validated successfully', logCtx);
    return { itinerary: validationResult.data, wasRepaired: false };
  }

  log('warn', 'Itinerary validation failed, attempting repair', logCtx, {
    errors: validationResult.error.errors.slice(0, 5).map((e: any) => e.message)
  });

  // Attempt repair via AI
  const repairPrompt = `The following JSON itinerary has validation errors. Please fix it to match this exact schema:

Required structure:
- tripSummary: string (optional)
- days: array of objects with:
  - dayNumber: integer 1-30
  - date: "YYYY-MM-DD" format (MUST be exactly these dates: ${dayDates.join(', ')})
  - title: string
  - activities: array with at least 1 activity, each having:
    - timeSlot: "morning" | "afternoon" | "evening"
    - title: string (required)
    - rating: number 0-5 (optional)
    - bookingUrl: string URL (optional)
    - whyItFits: string explaining why this fits user preferences
    - bestTimeToVisit: string
    - crowdLevel: "low" | "moderate" | "high" | "peak"
    - Other fields optional
  - mealSuggestions, planB, notes: optional
- lodgingSuggestions: array (optional) if lodging not booked

CRITICAL: The dates MUST be exactly: ${dayDates.join(', ')}. Do NOT change these dates.

Errors found:
${validationResult.error.errors.slice(0, 10).map((e: any) => `- ${e.path.join('.')}: ${e.message}`).join('\n')}

Original JSON to repair:
${JSON.stringify(itinerary).substring(0, 10000)}

Return ONLY the repaired valid JSON, no explanation.`;

  try {
    const repairResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-1.5-flash',
        messages: [{ role: 'user', content: repairPrompt }],
      }),
    });

    if (repairResponse.ok) {
      const repairData = await repairResponse.json();
      const repairedContent = repairData.choices?.[0]?.message?.content;

      if (repairedContent) {
        const cleanedRepair = repairedContent
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();

        const jsonStart = cleanedRepair.indexOf('{');
        const jsonEnd = cleanedRepair.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const repairedJson = JSON.parse(cleanedRepair.substring(jsonStart, jsonEnd + 1));

          // Enforce dates again on repaired version
          if (repairedJson.days) {
            for (const day of repairedJson.days) {
              const dayIndex = day.dayNumber - 1;
              if (dayIndex >= 0 && dayIndex < dayDates.length) {
                day.date = dayDates[dayIndex];
              }
            }
          }

          const repairedValidation = ItinerarySchema.safeParse(repairedJson);
          if (repairedValidation.success) {
            log('info', 'Itinerary repaired successfully', logCtx);
            return { itinerary: repairedValidation.data, wasRepaired: true };
          }
        }
      }
    }
  } catch (repairError) {
    log('error', 'Repair attempt failed', logCtx, {
      error: repairError instanceof Error ? repairError.message : 'Unknown'
    });
  }

  // If repair fails, try to build a minimal valid structure
  log('warn', 'Building minimal fallback itinerary', logCtx);

  const fallbackDays = dayDates.map((date, index) => ({
    dayNumber: index + 1,
    date,
    title: `Day ${index + 1} in ${tripDetails.destination}`,
    activities: [{
      timeSlot: "morning" as const,
      title: "Explore the area",
      description: "We couldn't generate detailed activities for this day. Please use the regenerate button to try again.",
      whyItFits: "General exploration",
      crowdLevel: "moderate" as const,
    }],
    notes: "This day needs to be regenerated - tap the button below.",
  }));

  return {
    itinerary: {
      tripSummary: `Trip to ${tripDetails.destination}`,
      days: fallbackDays,
      packingTips: [],
      generalTips: [],
    },
    wasRepaired: true,
  };
};

// Build system prompt based on trip context
const buildSystemPrompt = (tripDetails: TripDetails): string => {
  const isBusiness = tripDetails.tripPurpose === "business";
  const isMixed = tripDetails.tripPurpose === "mixed";
  const hasKids = tripDetails.hasKids || tripDetails.kidsAges.length > 0;
  const isPlannerMode = tripDetails.plannerMode === "planner";
  const clientInfo = tripDetails.clientInfo;
  const profilePrefs = tripDetails.profilePreferences;
  const providerPrefs = tripDetails.providerPreferences || ['any'];
  const needsLodging = !tripDetails.hasLodgingBooked;

  let systemPrompt = `You are an expert travel planner creating detailed, practical itineraries with REAL bookable activities.

CRITICAL RULES:
1. You MUST use the EXACT dates provided by the user. Never suggest alternative dates.
   (NOTE: If isFlexibleDates is true, these are placeholder dates, but still use them for the JSON structure).
2. Return ONLY valid JSON, no markdown or additional text.
3. Each day must have at least one activity.
4. Be realistic about timing and travel between locations.
5. ALWAYS include booking information and ratings when possible.
6. For EVERY activity/tour, include a "whyItFits" explaining why it matches user preferences.
7. Include "bestTimeToVisit" and "crowdLevel" for each attraction.
8. Generate REAL booking URLs for activities (use Viator, GetYourGuide, TripAdvisor formats).
9. If preferredSeason is provided and isFlexibleDates is true, prioritize activities appropriate for that season.`;

  if (tripDetails.isFlexibleDates && tripDetails.preferredSeason) {
    systemPrompt += `\n\nFLEXIBLE TRIP CONTEXT:
- These dates are placeholders for a general plan.
- PREFERRED SEASON: ${tripDetails.preferredSeason || 'Unknown'}
- Focus on activities, festivals, and weather appropriate for ${tripDetails.preferredSeason || 'typical conditions'}.`;
  }

  if (tripDetails.tripLegs && tripDetails.tripLegs.length > 0) {
    const legsSummary = tripDetails.tripLegs.map((leg: any) =>
      `- ${leg.country_name}: ${leg.duration_days || 'unspecified'} days${leg.cities ? ` (Cities: ${leg.cities.join(', ')})` : ''}`
    ).join('\n');
    systemPrompt += `\n\nTRIP ROUTE & DURATION:
${legsSummary}
Please ensure the itinerary respects these country allocations and the specified number of days in each.`;
  }

  // Provider preferences
  if (!providerPrefs.includes('any')) {
    const providerNames = providerPrefs.map((p: string) => {
      if (p === 'local_tour') return 'local tour operators';
      if (p === 'airbnb_experience') return 'Airbnb Experiences';
      return p;
    }).join(', ');
    systemPrompt += `\n\nPRIORITIZE activities from: ${providerNames}`;
  }

  // Lodging suggestions if not booked
  if (needsLodging) {
    systemPrompt += `\n\nINCLUDE "lodgingSuggestions" array with 3-5 hotel/rental options because user hasn't booked lodging yet.`;
  }

  if (isPlannerMode && clientInfo) {
    systemPrompt += `\n\nYou are helping a travel professional plan trips for clients.
- Party: ${clientInfo.numAdults} adult(s)${clientInfo.numKids > 0 ? `, ${clientInfo.numKids} child(ren)` : ''}
- Budget: ${clientInfo.budgetRange}
${clientInfo.kidsAges.length > 0 ? `- Kids' ages: ${clientInfo.kidsAges.join(', ')}` : ''}
${clientInfo.homeAirport ? `- Traveling from: ${clientInfo.homeAirport}` : ''}
${profilePrefs?.pace ? `- Pace: ${profilePrefs.pace}` : ''}
${profilePrefs?.kidFriendlyPriority === 'high' ? '- High priority on kid-friendly activities' : ''}`;
  } else if (isBusiness) {
    systemPrompt += `\n\nFocus on:
- Professional venues and efficient scheduling
- Business-appropriate dining for client meetings
- Venues with WiFi and workspaces
- Backup options for schedule changes`;
  } else if (isMixed) {
    systemPrompt += `\n\nBalance business and leisure:
- Separate business vs personal activities clearly
- Schedule business during appropriate hours
${hasKids ? '- Include family activities during leisure time' : ''}`;
  } else if (hasKids) {
    systemPrompt += `\n\nFamily travel focus:
- Realistic timing with kid-friendly breaks
- Account for nap times and rest periods
- Stroller-friendly options when needed
- "Plan B" alternatives for weather/tired kids
- Group activities by proximity
- ALWAYS set "isKidFriendly" and explain in "whyItFits" why each activity works for families`;
  } else {
    systemPrompt += `\n\nAdult travel focus:
- Diverse experiences and dining
- Evening entertainment options
- Group activities by proximity`;
  }

  // Accessibility requirements
  if (tripDetails.needsWheelchairAccess) {
    systemPrompt += `\n\nWHEELCHAIR ACCESSIBILITY REQUIRED:
- ONLY suggest wheelchair-accessible activities and venues
- For each activity, set "isWheelchairAccessible": true/false
- Include detailed "accessibilityNotes" (elevators, ramps, terrain type, step-free access)
- Note if reservations needed for accessible entrance
- Avoid cobblestone areas, stairs without alternatives`;
  }

  if (tripDetails.hasStroller) {
    systemPrompt += `\n\nSTROLLER TRAVELING:
- Prioritize stroller-friendly venues and paths
- For each activity, set "isStrollerFriendly": true/false
- Include detailed "strollerNotes" (terrain, stairs, elevator access, storage, bumpy surfaces)
- Note if stroller should be left at entrance
- Recommend transit options that accommodate strollers`;
  }

  // Phase 1: Critical family needs
  if (tripDetails.foodAllergies && tripDetails.foodAllergies.length > 0) {
    const allergyList = tripDetails.foodAllergies.map((a: string) => a.startsWith('custom:') ? a.replace('custom:', '') : a).join(', ');
    systemPrompt += `\n\n⚠️ FOOD ALLERGIES - SAFETY CRITICAL:
- The family has these allergies: ${allergyList}
- ONLY suggest restaurants/venues that can accommodate these allergies
- Include "allergyNotes" for each meal suggestion
- Flag any activities involving food (cooking classes, food tours) that may be problematic`;
  }

  if (tripDetails.sensorySensitivities && tripDetails.sensorySensitivities.length > 0) {
    systemPrompt += `\n\n🧠 SENSORY SENSITIVITIES:`;
    if (tripDetails.sensorySensitivities.includes('avoid_crowds')) {
      systemPrompt += `\n- AVOID crowded attractions/peak times. Suggest quiet alternatives.`;
    }
    if (tripDetails.sensorySensitivities.includes('avoid_loud')) {
      systemPrompt += `\n- AVOID loud environments (concerts, fireworks, busy markets).`;
    }
    if (tripDetails.sensorySensitivities.includes('need_routine')) {
      systemPrompt += `\n- Structure the day with a predictable routine.`;
    }
    if (tripDetails.sensorySensitivities.includes('need_quiet_spaces')) {
      systemPrompt += `\n- Identify quiet break spaces near major attractions.`;
    }
  }

  if (tripDetails.bedtime) {
    systemPrompt += `\n\n🌙 BEDTIME CONSTRAINT: ${tripDetails.bedtime}
- All evening activities MUST end at least 30 mins before this time allowed for travel back.
- Dinner should be scheduled accordingly.`;
  }

  if (tripDetails.maxWalkingMinutes && tripDetails.maxWalkingMinutes > 0) {
    systemPrompt += `\n\n🚶 WALKING LIMIT: Max ${tripDetails.maxWalkingMinutes} minutes walking between valid activities.
- Suggest transport for anything longer.`;
  }

  if (tripDetails.maxActivityMinutes && tripDetails.maxActivityMinutes > 0) {
    systemPrompt += `\n\n⏱️ ACTIVITY DURATION LIMIT: Max ${tripDetails.maxActivityMinutes} minutes per single activity.`;
  }

  // Phase 2: Logistics & Equipment
  if (tripDetails.carSeatNeeds && tripDetails.carSeatNeeds !== 'none') {
    systemPrompt += `\n\n🚗 CAR SEAT REQUIREMENT: ${tripDetails.carSeatNeeds}
- Prioritize transport options that provide car seats or are car-seat friendly (private transfers).
- Note if rideshares in the area typically have car seats available.`;
  }

  if (tripDetails.isSingleParent) {
    systemPrompt += `\n\n👤 SINGLE PARENT TRIP:
- Avoid overly complex logistics or split locations.
- Ensure all locations are manageable for one adult with kids.
- Suggest "parent helper" services if available (hotel babysitting, supervised kids clubs).`;
  }

  if (tripDetails.kidHeightsInches && tripDetails.kidHeightsInches.length > 0) {
    systemPrompt += `\n\n📏 KID HEIGHTS: ${tripDetails.kidHeightsInches.join(', ')}"
- Check height restrictions for any theme park rides or adventure activities.`;
  }

  // Distance and transit requirements
  systemPrompt += `\n\nDISTANCE AND TRANSIT REQUIREMENTS:
For EVERY activity, include:
- "distanceFromPrevious": distance in km from the previous activity (or from lodging for first activity)
- "distanceUnit": always "km"
- "travelTimeMinutes": estimated travel time in minutes
- "recommendedTransitMode": best way to get there ("walk", "taxi", "metro", "bus", "train", "rideshare")
- "transitDetails": specific instructions like "Take Metro Line A to Termini, then walk 5 min"
- "latitude" and "longitude": approximate coordinates for the venue`;

  if (profilePrefs) {
    systemPrompt += `\n\nProfile preferences:`;
    if (profilePrefs.pace) systemPrompt += `\n- Pace: ${profilePrefs.pace}`;
    if (profilePrefs.budgetLevel) systemPrompt += `\n- Budget: ${profilePrefs.budgetLevel}`;
    if (profilePrefs.kidFriendlyPriority) systemPrompt += `\n- Kid-friendly priority: ${profilePrefs.kidFriendlyPriority}`;
  }

  return systemPrompt;
};

// Build user prompt for itinerary generation
const buildUserPrompt = (
  tripDetails: TripDetails,
  tripDays: number,
  dayDates: string[],
  hasKids: boolean,
  italyWarnings: { city: string; info: typeof ITALY_MULTI_STATION_CITIES[string] }[]
): string => {
  const isBusiness = tripDetails.tripPurpose === "business";
  const isPlannerMode = tripDetails.plannerMode === "planner";
  const clientInfo = tripDetails.clientInfo;
  const needsLodging = !tripDetails.hasLodgingBooked;
  const hasTrainTravel = tripDetails.destination.toLowerCase().includes('italy') ||
    tripDetails.destination.toLowerCase().includes('europe') ||
    tripDetails.extraContext?.toLowerCase().includes('train');

  const safeDestination = sanitizeForPrompt(tripDetails.destination);
  const allInterests = tripDetails.interests
    .map((i: string) => i.startsWith("custom:") ? i.replace("custom:", "") : i)
    .map(sanitizeForPrompt)
    .join(', ');
  const safePace = sanitizeForPrompt(tripDetails.pacePreference);
  const safeBudget = sanitizeForPrompt(tripDetails.budgetLevel);
  const safeLodging = tripDetails.lodgingLocation ? sanitizeForPrompt(tripDetails.lodgingLocation) : '';
  const safeNapSchedule = tripDetails.napSchedule ? sanitizeForPrompt(tripDetails.napSchedule) : '';
  const safeExtraContext = tripDetails.extraContext ? sanitizeForPrompt(tripDetails.extraContext) : '';

  let userPrompt = `Create a ${tripDays}-day itinerary for ${safeDestination}.

EXACT DATES (DO NOT CHANGE):
${dayDates.map((d, i) => `Day ${i + 1}: ${d}`).join('\n')}

Trip Details:
- Start: ${tripDetails.startDate}, End: ${tripDetails.endDate}
- Purpose: ${tripDetails.tripPurpose || 'leisure'}
${hasKids ? `- Kids' ages: ${tripDetails.kidsAges.join(', ')}` : '- Adults only'}
- Interests: ${allInterests}
- Pace: ${safePace}
- Budget: ${safeBudget}
${safeLodging ? `- Staying near: ${safeLodging}` : ''}
${hasKids && safeNapSchedule ? `- Nap schedule: ${safeNapSchedule}` : ''}
${hasKids && tripDetails.strollerNeeds ? '- Need stroller-friendly options' : ''}
${tripDetails.needsWheelchairAccess ? '- ♿ WHEELCHAIR ACCESSIBILITY REQUIRED for all venues' : ''}
${tripDetails.hasStroller ? '- 🚼 TRAVELING WITH STROLLER - need stroller-friendly routes and venues' : ''}
${tripDetails.foodAllergies?.length > 0 ? `- ⚠️ ALLERGIES: ${tripDetails.foodAllergies.map((a: string) => a.startsWith('custom:') ? a.replace('custom:', '') : a).join(', ')}` : ''}
${tripDetails.sensorySensitivities?.length > 0 ? `- 🧠 SENSORY NEEDS: ${tripDetails.sensorySensitivities.join(', ')}` : ''}
${tripDetails.bedtime ? `- 🌙 BEDTIME: ${tripDetails.bedtime}` : ''}
${tripDetails.maxWalkingMinutes ? `- 🚶 WALKING LIMIT: Max ${tripDetails.maxWalkingMinutes} min` : ''}
${tripDetails.maxActivityMinutes ? `- ⏱️ ACTIVITY LIMIT: Max ${tripDetails.maxActivityMinutes} min` : ''}
${tripDetails.carSeatNeeds && tripDetails.carSeatNeeds !== 'none' ? `- 🚗 CAR SEATS: ${tripDetails.carSeatNeeds}` : ''}
${tripDetails.isSingleParent ? `- 👤 SINGLE PARENT TRIP` : ''}`;

  if (safeExtraContext) {
    userPrompt += `

IMPORTANT USER CONTEXT:
${safeExtraContext}

Incorporate this context throughout the itinerary.`;
  }

  if (isPlannerMode && clientInfo) {
    userPrompt += `

Client info:
- Party: ${clientInfo.numAdults} adult(s), ${clientInfo.numKids} child(ren)
${clientInfo.kidsAges.length > 0 ? `- Children's ages: ${clientInfo.kidsAges.join(', ')}` : ''}
- Budget: ${clientInfo.budgetRange}
${clientInfo.homeAirport ? `- From: ${clientInfo.homeAirport}` : ''}`;
  }

  // Italy station warnings
  if (italyWarnings.length > 0 && hasTrainTravel) {
    userPrompt += `

⚠️ ITALY TRAIN STATION WARNINGS:
${italyWarnings.map(w => `${w.city}: Has multiple stations (${w.info.stations.join(', ')}). ${w.info.guidance}`).join('\n')}

When suggesting train travel, ALWAYS:
1. Specify the exact station name
2. Include "stationWarning" if the city has multiple stations
3. Include "stationGuidance" with which station is best for the lodging location`;
  }

  userPrompt += `

Return this exact JSON structure:
{
  "tripSummary": "Brief overview",
  ${needsLodging ? `"lodgingSuggestions": [
    {
      "name": "Hotel/Rental Name",
      "description": "Why it's great",
      "lodgingType": "hotel|vacation_rental|hostel|apartment",
      "rating": 4.5,
      "reviewCount": 500,
      "pricePerNight": 150,
      "bookingUrl": "https://booking.com/...",
      "address": "Full address",
      "amenities": ["WiFi", "Pool", "Kitchen"],
      "isKidFriendly": true,
      "distanceFromCenter": "5 min walk",
      "whyRecommended": "Perfect for families because..."
    }
  ],` : ''}
  "days": [
    {
      "dayNumber": 1,
      "date": "${dayDates[0]}",
      "title": "Day theme",
      "weather_notes": "Weather tips",
      ${hasTrainTravel ? `"trainSegments": [
        {
          "originCity": "City",
          "originStation": "Exact Station Name",
          "destinationCity": "City",
          "destinationStation": "Exact Station Name",
          "departureTime": "09:30",
          "arrivalTime": "11:45",
          "durationMinutes": 135,
          "trainType": "Frecciarossa",
          "bookingUrl": "https://www.thetrainline.com/...",
          "priceEstimate": 45,
          "stationGuidance": "Best station for your hotel location",
          "stationWarning": "Multiple stations in this city - check carefully"
        }
      ],` : ''}
      "activities": [
        {
          "timeSlot": "morning|afternoon|evening",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "Activity name",
          "description": "What you'll experience",
          "locationName": "Place name",
          "locationAddress": "Full address",
          "latitude": 41.8902,
          "longitude": 12.4922,
          "category": "${isBusiness ? 'meeting|restaurant|transport|networking|rest' : 'attraction|restaurant|outdoor|museum|entertainment|transport'}",
          "durationMinutes": 90,
          "costEstimate": 50,
          "rating": 4.5,
          "reviewCount": 1200,
          "bookingUrl": "https://www.viator.com/tours/...",
          "providerType": "local_tour|airbnb_experience|viator|getyourguide|restaurant|attraction",
          "whyItFits": "Perfect for your family because [specific reason based on kids ages/interests]",
          "bestTimeToVisit": "Morning before 10am - fewer crowds",
          "crowdLevel": "low|moderate|high|peak",
          "seasonalNotes": "Peak season in July - expect longer queues",
          "distanceFromPrevious": 1.5,
          "distanceUnit": "km",
          "travelTimeMinutes": 15,
          "recommendedTransitMode": "walk|taxi|metro|bus|train|rideshare",
          "transitDetails": "Take Metro Line A to Colosseo station, exit and walk 2 min",
          ${tripDetails.needsWheelchairAccess ? `"isWheelchairAccessible": true,
          "accessibilityNotes": "Elevator available at entrance, ramps throughout, step-free access",` : ''}
          ${tripDetails.hasStroller ? `"isStrollerFriendly": true,
          "strollerNotes": "Flat terrain, stroller storage available, elevator access",` : ''}
          ${hasTrainTravel ? `"transportBookingUrl": "https://...",
          "transportStationNotes": "Take the Metro Line 1 from hotel",` : ''}
          ${hasKids ? `"isKidFriendly": true,` : ''}
          "requiresReservation": false,
          "reservationInfo": "How to book"
        }
      ],
      "mealSuggestions": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "name": "Restaurant",
          "description": "Why it's good",
          "priceRange": "$|$$|$$$",
          "rating": 4.3,
          "bookingUrl": "https://www.tripadvisor.com/..."
          ${hasKids ? `,"kidFriendlyNotes": "For families"` : ''}
        }
      ],
      "planB": "Alternative plan if weather is bad or kids are tired",
      "notes": "Day tips"
    }
  ],
  "packingTips": ["Item 1", "Item 2"],
  "generalTips": ["Tip 1", "Tip 2"]${hasTrainTravel ? `,
  "trainBookingTips": "Book Trenitalia or Italo trains 2-3 weeks ahead for best prices. Consider Eurail pass for multiple journeys."` : ''}
}

CRITICAL REQUIREMENTS:
1. Each day's date field MUST exactly match the dates listed above.
2. EVERY activity MUST have: rating (estimate 3.5-5.0), bookingUrl, whyItFits, bestTimeToVisit, crowdLevel
3. If rating unavailable, use null but STILL provide bookingUrl
4. Return ONLY valid JSON.`;

  return userPrompt;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const logCtx: LogContext = { requestId, userId: 'unknown', step: 'init' };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Please sign in to generate itineraries.',
        code: 'UNAUTHORIZED'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logCtx.userId = user.id;
    logCtx.step = 'auth_complete';

    const rateLimit = await checkRateLimit(
      serviceClient, user.id, 'generate-itinerary',
      RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimit.allowed) {
      log('warn', 'Rate limit exceeded', logCtx, { retryAfter: rateLimit.retryAfter });
      return new Response(JSON.stringify({
        error: 'You\'ve made too many requests. Please wait a few minutes and try again.',
        code: 'RATE_LIMITED',
        retryAfter: rateLimit.retryAfter
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': rateLimit.retryAfter?.toString() || '3600'
        },
      });
    }

    const rawDetails = await req.json();
    logCtx.payloadSize = JSON.stringify(rawDetails).length;
    logCtx.step = 'parsing_input';

    const validationResult = TripDetailsSchema.safeParse(rawDetails);

    if (!validationResult.success) {
      log('warn', 'Input validation failed', logCtx, {
        errors: validationResult.error.errors.map((e: any) => e.message)
      });
      return new Response(JSON.stringify({
        error: 'Please check your trip details and try again.',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors.map((e: any) => e.message)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tripDetails = validationResult.data;
    logCtx.destination = tripDetails.destination;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      log('error', 'LOVABLE_API_KEY not configured', logCtx);
      return new Response(JSON.stringify({
        error: 'The AI service is not configured. Please contact support.',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startDate = new Date(tripDetails.startDate);
    const endDate = new Date(tripDetails.endDate);

    if (endDate < startDate) {
      return new Response(JSON.stringify({
        error: 'End date must be after start date.',
        code: 'INVALID_DATES'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (tripDays > 30) {
      return new Response(JSON.stringify({
        error: 'Trips cannot exceed 30 days.',
        code: 'TRIP_TOO_LONG'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate exact dates for each day
    const dayDates = calculateDayDates(tripDetails.startDate, tripDays);
    const hasKids = tripDetails.hasKids || tripDetails.kidsAges.length > 0;

    // Detect Italy station warnings
    const italyWarnings = detectItalyStationWarnings(tripDetails.destination);

    logCtx.step = 'generating_itinerary';
    log('info', 'Starting itinerary generation', logCtx, { tripDays, hasKids, italyWarnings: italyWarnings.length });

    const systemPrompt = buildSystemPrompt(tripDetails);
    const userPrompt = buildUserPrompt(tripDetails, tripDays, dayDates, hasKids, italyWarnings);

    const response = await fetchWithRetry(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-1.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      },
      logCtx
    );

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'AI gateway error', logCtx, { status: response.status, error: errorText.substring(0, 200) });

      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: 'The AI service is busy. Please try again in a moment.',
          code: 'AI_RATE_LIMITED'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({
          error: 'AI credits are exhausted. Please add credits to continue.',
          code: 'CREDITS_EXHAUSTED'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        error: 'Failed to generate itinerary. Please try again.',
        code: 'AI_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logCtx.step = 'parsing_response';
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      log('error', 'Empty AI response', logCtx);
      return new Response(JSON.stringify({
        error: 'The AI returned an empty response. Please try again.',
        code: 'EMPTY_RESPONSE'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let rawItinerary;
    try {
      let cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }

      rawItinerary = JSON.parse(cleanedContent);
    } catch (parseError) {
      log('error', 'JSON parse failed', logCtx, {
        contentPreview: content.substring(0, 300)
      });
      return new Response(JSON.stringify({
        error: 'Failed to parse the AI response. Please try again.',
        code: 'PARSE_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logCtx.step = 'validating_schema';
    const { itinerary, wasRepaired } = await validateAndRepairItinerary(
      rawItinerary, tripDetails, tripDays, dayDates, logCtx, LOVABLE_API_KEY
    );

    log('info', 'Itinerary generated successfully', logCtx, {
      daysGenerated: itinerary.days.length,
      wasRepaired,
      hasLodgingSuggestions: !!itinerary.lodgingSuggestions?.length,
      hasTrainSegments: itinerary.days.some((d: any) => d.trainSegments?.length)
    });

    // Mark days that need regeneration
    const daysNeedingRegeneration = itinerary.days
      .filter((day: any) => day.activities.length === 1 &&
        day.activities[0].description?.includes("couldn't generate"))
      .map((day: any) => day.dayNumber);

    return new Response(JSON.stringify({
      itinerary,
      meta: {
        requestId,
        wasRepaired,
        daysNeedingRegeneration,
        generatedAt: new Date().toISOString(),
        italyStationWarnings: italyWarnings.length > 0 ? italyWarnings : undefined,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    logCtx.step = 'error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Unexpected error', logCtx, { error: errorMessage });

    return new Response(JSON.stringify({
      error: 'Something went wrong. Please try again.',
      code: 'INTERNAL_ERROR',
      requestId,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
