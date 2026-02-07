import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per hour
const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window

// Rate limit record type
interface RateLimitRecord {
  id: string;
  user_id: string;
  function_name: string;
  request_count: number;
  window_start: string;
  created_at: string;
}

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', suggestions: [], recommendations: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for rate limiting
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token', suggestions: [], recommendations: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Check rate limit
    const rateLimit = await checkRateLimit(
      serviceClient,
      user.id,
      'generate-trip-suggestions',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimit.retryAfter,
        suggestions: [],
        recommendations: []
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': rateLimit.retryAfter?.toString() || '3600'
        },
      });
    }

    const body = await req.json();
    const { request_type, preferences, visited_countries, wishlistCountries, visitedContinents, visitedCountries } = body;

    // Validate request_type
    const validRequestTypes = ['recommendations', 'quick_itinerary', 'suggestions', 'parse_documents', undefined];
    if (request_type && !validRequestTypes.includes(request_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request_type', suggestions: [], recommendations: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle recommendations request
    if (request_type === "recommendations") {
      const prompt = `Based on this traveler's profile, recommend 5 countries they should visit next.

Travel Preferences:
- Travel Style: ${preferences?.travel_style?.join(', ') || 'Not specified'}
- Interests: ${preferences?.interests?.join(', ') || 'Not specified'}
- Budget: ${preferences?.budget || 'moderate'}
- Pace: ${preferences?.pace || 'moderate'}
- Loved Countries: ${preferences?.liked_countries?.join(', ') || 'None specified'}
- Disliked Countries: ${preferences?.disliked_countries?.join(', ') || 'None'}
- Avoid: ${preferences?.avoid?.join(', ') || 'Nothing specified'}

Already Visited: ${visited_countries?.join(', ') || 'None yet'}

IMPORTANT: Do NOT recommend countries they have already visited.
Consider countries similar to ones they loved, and avoid similarities to countries they disliked.

Return a JSON object with a "recommendations" array. Each recommendation should have:
- country: country name (just the name, no emoji)
- reason: personalized explanation why this matches their preferences (2-3 sentences)
- matchScore: number from 70-99 showing how well it matches their preferences
- highlights: array of 4 things they'd love there based on their interests
- bestTimeToVisit: the best season or months to visit

Return ONLY valid JSON, no markdown or explanation.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-1.5-flash",
          messages: [
            { role: "system", content: "You are an expert travel advisor who creates personalized recommendations. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [] };
      } catch {
        result = { recommendations: [] };
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle quick itinerary request
    if (request_type === "quick_itinerary") {
      const { destination, days, preferences: userPrefs } = body;

      // Validate inputs
      if (!destination || typeof destination !== 'string' || destination.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid destination' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!days || typeof days !== 'number' || days < 1 || days > 30) {
        return new Response(
          JSON.stringify({ error: 'Invalid days (must be 1-30)' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sanitize destination
      const sanitizedDestination = destination.replace(/[<>]/g, '').substring(0, 100).trim();

      const prompt = `Create a ${days}-day travel itinerary for ${sanitizedDestination}.

Traveler Preferences:
- Travel Style: ${userPrefs?.travel_style?.join(', ') || 'balanced'}
- Interests: ${userPrefs?.interests?.join(', ') || 'general sightseeing'}
- Budget: ${userPrefs?.budget || 'moderate'}
- Pace: ${userPrefs?.pace || 'moderate'}

Create a day-by-day itinerary with morning, afternoon, and evening activities.

Return a JSON object with:
- destination: the destination name
- summary: 2-3 sentence overview of the trip
- days: array of day objects, each with:
  - dayNumber: number
  - title: catchy title for the day
  - morning: { activity: string, description: string, duration: string }
  - afternoon: { activity: string, description: string, duration: string }
  - evening: { activity: string, description: string, duration: string }
  - tips: one helpful tip for this day

Return ONLY valid JSON, no markdown or explanation.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-1.5-flash",
          messages: [
            { role: "system", content: "You are an expert travel planner creating detailed, practical itineraries. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        result = {};
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle document parsing request (Batch Import)
    if (request_type === "parse_documents") {
      const { content } = body;

      if (!content || typeof content !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid content' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SIMPLIFIED PROMPT: Only extract raw flight data
      const prompt = `Extract flight information from this text. Look for airport codes, dates, airlines, and flight numbers.

TEXT:
${content.substring(0, 5000)}

Return JSON with this EXACT structure:
{
  "flights": [
    {
      "departure_airport": "3-letter code like LAS",
      "arrival_airport": "3-letter code like FLL",
      "date": "YYYY-MM-DD format",
      "airline": "airline name if found",
      "flight_number": "flight number if found"
    }
  ]
}

RULES:
- If year is missing, use 2026 for dates in Jan-Jun, use 2025 for dates in Jul-Dec
- "Las Vegas" = LAS, "Fort Lauderdale" = FLL, etc.
- Always return valid JSON even if no flights found (return empty array)

Return ONLY the JSON, nothing else.`;

      console.log("[parse_documents] Sending to AI:", content.substring(0, 200) + "...");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-1.5-flash",
          messages: [
            { role: "system", content: "You extract structured data from text. Always respond with valid JSON only. Be lenient - if you see anything that looks like travel info, extract it." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
        }),
      });

      const data = await response.json();
      const responseContent = data.choices?.[0]?.message?.content || '{}';

      console.log("[parse_documents] AI response:", responseContent);

      let result;
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { flights: [] };
      } catch (parseError) {
        console.error("[parse_documents] JSON parse error:", parseError);
        result = { flights: [], raw_response: responseContent };
      }

      // Convert flights to trips format for backwards compatibility
      const trips = (result.flights || []).map((flight: any) => ({
        title: `Flight to ${flight.arrival_airport || 'Unknown'}`,
        destination: flight.arrival_airport,
        departure_airport: flight.departure_airport,
        arrival_airport: flight.arrival_airport,
        start_date: flight.date,
        end_date: flight.date,
        airline: flight.airline,
        flight_number: flight.flight_number,
        summary: `${flight.airline || 'Flight'} ${flight.flight_number || ''} ${flight.departure_airport} → ${flight.arrival_airport}`.trim()
      }));

      console.log("[parse_documents] Extracted trips:", trips);

      return new Response(
        JSON.stringify({ trips, flights: result.flights, raw_response: responseContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: original suggestion logic
    const prompt = `Based on this travel profile, suggest 3 countries to visit next:

Visited countries: ${(visitedCountries || []).join(', ') || 'None yet'}
Wishlist countries: ${(wishlistCountries || []).join(', ') || 'None'}
Continents explored: ${(visitedContinents || []).join(', ') || 'None'}

Return a JSON array with exactly 3 suggestions. Each suggestion should have:
- country: country name with flag emoji
- reason: personalized reason based on their travel history (1 sentence)
- highlights: array of 3 short highlights (2-3 words each)

Return ONLY valid JSON, no markdown or explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { role: "system", content: "You are a travel expert. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let suggestions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, suggestions: [], recommendations: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
