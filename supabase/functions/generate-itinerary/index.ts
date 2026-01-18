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
  // For regenerating specific days
  regenerateDayNumber: z.number().int().min(1).max(30).optional(),
});

// Strict output schema for itinerary
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
  bookingLinkPlaceholder: z.string().max(200).optional(),
});

const MealSuggestionSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  kidFriendlyNotes: z.string().max(300).optional(),
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
});

const ItinerarySchema = z.object({
  tripSummary: z.string().max(1000).optional(),
  days: z.array(DaySchema).min(1).max(30),
  packingTips: z.array(z.string().max(200)).optional(),
  generalTips: z.array(z.string().max(200)).optional(),
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
      
      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Retry on 429 (rate limit) or 5xx (server errors)
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
    const it = itinerary as { days: Array<{ dayNumber: number; date?: string }> };
    for (const day of it.days) {
      const dayIndex = day.dayNumber - 1;
      if (dayIndex >= 0 && dayIndex < dayDates.length) {
        day.date = dayDates[dayIndex];
      }
    }
  }
  
  const validationResult = ItinerarySchema.safeParse(itinerary);
  
  if (validationResult.success) {
    log('info', 'Itinerary validated successfully', logCtx);
    return { itinerary: validationResult.data, wasRepaired: false };
  }
  
  log('warn', 'Itinerary validation failed, attempting repair', logCtx, {
    errors: validationResult.error.errors.slice(0, 5).map(e => e.message)
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
    - Other fields optional
  - mealSuggestions, planB, notes: optional

CRITICAL: The dates MUST be exactly: ${dayDates.join(', ')}. Do NOT change these dates.

Errors found:
${validationResult.error.errors.slice(0, 10).map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n')}

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
        model: 'google/gemini-2.5-flash-lite',
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

  let systemPrompt = `You are an expert travel planner creating detailed, practical itineraries.

CRITICAL RULES:
1. You MUST use the EXACT dates provided by the user. Never suggest alternative dates.
2. Return ONLY valid JSON, no markdown or additional text.
3. Each day must have at least one activity.
4. Be realistic about timing and travel between locations.`;
  
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
- Group activities by proximity`;
  } else {
    systemPrompt += `\n\nAdult travel focus:
- Diverse experiences and dining
- Evening entertainment options
- Group activities by proximity`;
  }

  if (profilePrefs) {
    systemPrompt += `\n\nProfile preferences:`;
    if (profilePrefs.pace) systemPrompt += `\n- Pace: ${profilePrefs.pace}`;
    if (profilePrefs.budgetLevel) systemPrompt += `\n- Budget: ${profilePrefs.budgetLevel}`;
    if (profilePrefs.kidFriendlyPriority) systemPrompt += `\n- Kid-friendly priority: ${profilePrefs.kidFriendlyPriority}`;
  }

  return systemPrompt;
};

// Build user prompt for itinerary generation
const buildUserPrompt = (tripDetails: TripDetails, tripDays: number, dayDates: string[], hasKids: boolean): string => {
  const isBusiness = tripDetails.tripPurpose === "business";
  const isMixed = tripDetails.tripPurpose === "mixed";
  const isPlannerMode = tripDetails.plannerMode === "planner";
  const clientInfo = tripDetails.clientInfo;

  const safeDestination = sanitizeForPrompt(tripDetails.destination);
  const allInterests = tripDetails.interests
    .map(i => i.startsWith("custom:") ? i.replace("custom:", "") : i)
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
${hasKids && tripDetails.strollerNeeds ? '- Need stroller-friendly options' : ''}`;

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

  userPrompt += `

Return this exact JSON structure:
{
  "tripSummary": "Brief overview",
  "days": [
    {
      "dayNumber": 1,
      "date": "${dayDates[0]}",
      "title": "Day theme",
      "weather_notes": "Weather tips",
      "activities": [
        {
          "timeSlot": "morning|afternoon|evening",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "Activity name",
          "description": "Why this is great",
          "locationName": "Place name",
          "locationAddress": "Full address",
          "category": "${isBusiness ? 'meeting|restaurant|transport|networking|rest' : 'attraction|restaurant|outdoor|museum|entertainment|transport'}",
          "durationMinutes": 90,
          "costEstimate": 50,
          "transitMode": "walk|taxi|metro|bus",
          "accessibilityTags": ["wheelchair", "stroller-friendly"],
          "bookingLinkPlaceholder": "search: [venue name] booking"
          ${hasKids ? `,"isKidFriendly": true,
          "isStrollerFriendly": true,
          "strollerNotes": "Stroller info"` : ''}
          ,"requiresReservation": false,
          "reservationInfo": "How to book"
        }
      ],
      "mealSuggestions": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "name": "Restaurant",
          "description": "Why it's good",
          "priceRange": "$|$$|$$$"
          ${hasKids ? `,"kidFriendlyNotes": "For families"` : ''}
        }
      ],
      "planB": "Alternative plan",
      "notes": "Day tips"
    }
  ],
  "packingTips": ["Item 1", "Item 2"],
  "generalTips": ["Tip 1", "Tip 2"]
}

CRITICAL: Each day's date field MUST exactly match the dates listed above. Return ONLY valid JSON.`;

  return userPrompt;
};

serve(async (req) => {
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
      return new Response(JSON.stringify({ 
        error: 'Your session has expired. Please sign in again.',
        code: 'INVALID_TOKEN' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        errors: validationResult.error.errors.map(e => e.message) 
      });
      return new Response(JSON.stringify({ 
        error: 'Please check your trip details and try again.',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors.map(e => e.message) 
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

    logCtx.step = 'generating_itinerary';
    log('info', 'Starting itinerary generation', logCtx, { tripDays, hasKids });

    const systemPrompt = buildSystemPrompt(tripDetails);
    const userPrompt = buildUserPrompt(tripDetails, tripDays, dayDates, hasKids);

    const response = await fetchWithRetry(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
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
      wasRepaired 
    });

    // Mark days that need regeneration
    const daysNeedingRegeneration = itinerary.days
      .filter(day => day.activities.length === 1 && 
        day.activities[0].description?.includes("couldn't generate"))
      .map(day => day.dayNumber);

    return new Response(JSON.stringify({ 
      itinerary,
      meta: {
        requestId,
        wasRepaired,
        daysNeedingRegeneration,
        generatedAt: new Date().toISOString(),
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
