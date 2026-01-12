import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per hour
const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window

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
});

type TripDetails = z.infer<typeof TripDetailsSchema>;

// Rate limit record type
interface RateLimitRecord {
  id: string;
  user_id: string;
  function_name: string;
  request_count: number;
  window_start: string;
  created_at: string;
}

// Sanitize text for safe prompt injection prevention
const sanitizeForPrompt = (text: string): string => {
  return text
    .replace(/[\n\r]/g, ' ')
    .replace(/[<>]/g, '')
    .substring(0, 200)
    .trim();
};

// Check rate limit for user
const checkRateLimit = async (
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> => {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  try {
    // Check for existing rate limit record
    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('function_name', functionName)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Rate limit check error:', error.message);
      // Allow request on error to prevent blocking users
      return { allowed: true };
    }
    
    const record = data as RateLimitRecord | null;
    
    if (!record) {
      // First request - create new record
      await supabase.from('api_rate_limits').insert({
        user_id: userId,
        function_name: functionName,
        request_count: 1,
        window_start: new Date().toISOString()
      } as RateLimitRecord);
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    // Check if window has expired
    const recordWindowStart = new Date(record.window_start);
    if (recordWindowStart < windowStart) {
      // Window expired - reset counter
      await supabase
        .from('api_rate_limits')
        .update({ 
          request_count: 1, 
          window_start: new Date().toISOString() 
        } as Partial<RateLimitRecord>)
        .eq('id', record.id);
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    // Check if limit exceeded
    if (record.request_count >= maxRequests) {
      const resetTime = new Date(record.window_start).getTime() + windowMinutes * 60 * 1000;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      console.log(`Rate limit exceeded for user ${userId} on ${functionName}. Retry after ${retryAfter}s`);
      return { allowed: false, retryAfter, remaining: 0 };
    }
    
    // Increment counter
    await supabase
      .from('api_rate_limits')
      .update({ request_count: record.request_count + 1 } as Partial<RateLimitRecord>)
      .eq('id', record.id);
      
    return { allowed: true, remaining: maxRequests - record.request_count - 1 };
  } catch (err) {
    console.error('Rate limit error:', err);
    // Allow request on error
    return { allowed: true };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Request rejected: No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role for rate limiting
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create Supabase client to verify JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.log('Request rejected: Invalid token', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    // Check rate limit
    const rateLimit = await checkRateLimit(
      serviceClient, 
      user.id, 
      'generate-itinerary', 
      RATE_LIMIT_MAX_REQUESTS, 
      RATE_LIMIT_WINDOW_MINUTES
    );
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
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

    // Parse and validate input
    const rawDetails = await req.json();
    const validationResult = TripDetailsSchema.safeParse(rawDetails);
    
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.errors.map(e => e.message) 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tripDetails = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate date order
    const startDate = new Date(tripDetails.startDate);
    const endDate = new Date(tripDetails.endDate);
    
    if (endDate < startDate) {
      return new Response(JSON.stringify({ error: 'End date must be after start date' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (tripDays > 30) {
      return new Response(JSON.stringify({ error: 'Trip cannot exceed 30 days' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt based on trip purpose
    const isBusiness = tripDetails.tripPurpose === "business";
    const isMixed = tripDetails.tripPurpose === "mixed";
    const hasKids = tripDetails.hasKids || tripDetails.kidsAges.length > 0;

    let systemPrompt = `You are an expert travel planner creating detailed, practical itineraries.`;
    
    if (isBusiness) {
      systemPrompt = `You are an expert business travel planner. You create efficient itineraries that maximize productivity while allowing for networking opportunities and local experiences.

Your itineraries should:
- Prioritize business meetings and work commitments
- Include professional dining options for client meetings
- Suggest convenient transport between business venues
- Include downtime for preparation and rest
- Recommend business-appropriate restaurants and venues
- Note which venues have good WiFi and workspaces
- Include backup options for cancelled meetings`;
    } else if (isMixed) {
      systemPrompt = `You are an expert travel planner specializing in "bleisure" trips that combine business and leisure. You create balanced itineraries that accommodate work commitments while maximizing leisure time.

Your itineraries should:
- Clearly separate business and leisure activities
- Schedule business activities during appropriate hours
- Include leisure activities around work commitments
${hasKids ? `- Account for kid-friendly activities during leisure time
- Suggest family-friendly dining options` : ''}
- Suggest efficient transitions between work and personal time
- Note venues with good WiFi for impromptu work needs`;
    } else if (hasKids) {
      systemPrompt = `You are an expert family travel planner specializing in trips with children. You create detailed, practical itineraries that account for kids' needs, energy levels, and attention spans.

Your itineraries should:
- Be realistic about timing and travel between locations
- Include kid-friendly meal suggestions at appropriate times
- Account for nap times and rest periods for younger children
- Suggest stroller-friendly options when relevant
- Include "Plan B" alternatives for bad weather or tired kids
- Group activities by proximity to minimize travel time
- Note which activities require reservations
- Include estimated costs and duration for each activity`;
    } else {
      systemPrompt = `You are an expert travel planner creating detailed, practical itineraries for adults.

Your itineraries should:
- Be realistic about timing and travel between locations
- Include diverse dining experiences
- Group activities by proximity to minimize travel time
- Note which activities require reservations
- Include estimated costs and duration for each activity
- Suggest nightlife and evening entertainment options where relevant`;
    }

    // Sanitize user inputs before including in prompt
    const safeDestination = sanitizeForPrompt(tripDetails.destination);
    const safeInterests = tripDetails.interests.map(i => sanitizeForPrompt(i)).join(', ');
    const safePace = sanitizeForPrompt(tripDetails.pacePreference);
    const safeBudget = sanitizeForPrompt(tripDetails.budgetLevel);
    const safeLodging = tripDetails.lodgingLocation ? sanitizeForPrompt(tripDetails.lodgingLocation) : '';
    const safeNapSchedule = tripDetails.napSchedule ? sanitizeForPrompt(tripDetails.napSchedule) : '';

    // Parse custom interests
    const customInterests = tripDetails.interests.filter(i => i.startsWith("custom:")).map(i => i.replace("custom:", ""));
    const standardInterests = tripDetails.interests.filter(i => !i.startsWith("custom:"));
    const allInterests = [...standardInterests, ...customInterests];

    const userPrompt = `Create a ${tripDays}-day ${isBusiness ? 'business' : isMixed ? 'bleisure' : 'travel'} itinerary for ${safeDestination}.

Trip Details:
- Dates: ${tripDetails.startDate} to ${tripDetails.endDate}
- Trip Purpose: ${tripDetails.tripPurpose || 'leisure'}
${hasKids ? `- Kids' ages: ${tripDetails.kidsAges.join(', ')} years old` : '- Adult travelers only'}
- Interests: ${allInterests.map(i => sanitizeForPrompt(i)).join(', ')}
- Pace preference: ${safePace}
- Budget level: ${safeBudget}
${safeLodging ? `- Staying near: ${safeLodging}` : ''}
${hasKids && safeNapSchedule ? `- Nap schedule: ${safeNapSchedule}` : ''}
${hasKids && tripDetails.strollerNeeds ? '- Need stroller-friendly options' : ''}

${isBusiness ? 'Focus on professional venues, efficient scheduling, and business-appropriate activities.' : ''}
${isMixed ? 'Balance business commitments with leisure activities. Mark which activities are business vs personal.' : ''}
${!hasKids ? 'Do NOT include kid-friendly ratings or stroller information in the response.' : ''}

Please generate a detailed day-by-day itinerary in the following JSON format:
{
  "tripSummary": "Brief overview of the trip",
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "title": "Day theme/title",
      "weather_notes": "Season-appropriate clothing/weather tips",
      "activities": [
        {
          "timeSlot": "morning|afternoon|evening",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "Activity name",
          "description": "Why this is great${isBusiness ? ' for business' : isMixed ? ' (mark as business/leisure)' : ''}",
          "locationName": "Place name",
          "locationAddress": "Full address",
          "category": "${isBusiness ? 'meeting|restaurant|transport|networking|rest|sightseeing' : 'attraction|restaurant|outdoor|museum|entertainment|transport|rest'}",
          "durationMinutes": 90,
          "costEstimate": 50${hasKids ? `,
          "isKidFriendly": true,
          "isStrollerFriendly": true` : ''},
          "requiresReservation": false,
          "reservationInfo": "How to book if needed"
        }
      ],
      "mealSuggestions": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "name": "Restaurant name",
          "description": "Why it's good${hasKids ? ' for families' : ''}",
          "priceRange": "$|$$|$$$"${hasKids ? `,
          "kidFriendlyNotes": "What kids will like"` : ''}
        }
      ],
      "planB": "${hasKids ? 'Alternative plan for rain or tired kids' : 'Alternative plan for bad weather'}",
      "notes": "Tips for this day"
    }
  ],
  "packingTips": ["List of items specific to this destination"],
  "generalTips": ["Overall trip tips${hasKids ? ' for families' : ''}"]
}

Ensure all times are realistic and include buffer time for transitions. Return ONLY valid JSON, no additional text.`;

    console.log('Generating itinerary for:', safeDestination, 'by user:', user.id);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON from the response
    let itinerary;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      itinerary = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse itinerary JSON:', content);
      throw new Error('Failed to parse itinerary response');
    }

    console.log('Successfully generated itinerary with', itinerary.days?.length, 'days for user:', user.id);

    return new Response(JSON.stringify({ itinerary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error generating itinerary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate itinerary';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
