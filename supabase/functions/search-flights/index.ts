import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client and verify JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Invalid authentication token:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { origin, destination, departureDate, returnDate, passengers, tripType } = await req.json();

    console.log(`User ${userId} searching flights: ${origin} -> ${destination}, ${departureDate}${returnDate ? ` - ${returnDate}` : ''}, ${passengers} passengers`);

    const liteApiKey = Deno.env.get('LITEAPI_SANDBOX_KEY');
    
    // If no API key configured
    if (!liteApiKey) {
      console.log('No flight API key configured');
      return new Response(JSON.stringify({ 
        error: 'Flight search not configured',
        errorCode: 'NO_API_KEY',
        message: 'No flight search API is configured. Please configure a flight API key (LiteAPI, Amadeus, or Skyscanner) to enable real flight search.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LiteAPI REST API for flight search
    const searchParams = new URLSearchParams({
      origin,
      destination,
      departureDate,
      adults: String(passengers),
      currency: 'USD',
    });
    
    if (returnDate && tripType === 'roundtrip') {
      searchParams.append('returnDate', returnDate);
    }

    console.log(`Calling LiteAPI with params: ${searchParams.toString()}`);

    let response;
    try {
      response = await fetch(`https://api.liteapi.travel/v3.0/flights/search?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': liteApiKey,
        },
      });
    } catch (fetchError) {
      console.error('Network error calling LiteAPI:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to flight search API',
        errorCode: 'NETWORK_ERROR',
        message: 'Unable to reach the flight search service. The LiteAPI service may be down or the API key may be invalid.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if response is ok
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }
      console.error('LiteAPI HTTP error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: `Flight API returned error (HTTP ${response.status})`,
        errorCode: 'API_ERROR',
        message: `The LiteAPI service returned an error. This could mean the API key is invalid, the sandbox key doesn't support this route, or the service is unavailable. Consider trying Amadeus or Skyscanner APIs.`,
        details: errorText.substring(0, 200),
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      console.log('Could not read response text');
      return new Response(JSON.stringify({ 
        error: 'Failed to read API response',
        errorCode: 'RESPONSE_ERROR',
        message: 'The flight API returned an unreadable response. The LiteAPI sandbox may not support this route.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle empty responses
    if (!responseText || responseText.trim() === '') {
      console.log('LiteAPI returned empty response');
      return new Response(JSON.stringify({ 
        error: 'No data returned from flight API',
        errorCode: 'EMPTY_RESPONSE',
        message: 'The LiteAPI sandbox returned no data for this route. Sandbox APIs often have limited route coverage. Consider using Amadeus Self-Service API (free tier available) or Skyscanner Affiliate API for better coverage.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse LiteAPI response:', responseText.substring(0, 500));
      return new Response(JSON.stringify({ 
        error: 'Invalid response from flight API',
        errorCode: 'PARSE_ERROR',
        message: 'The flight API returned malformed data. This may indicate an issue with the LiteAPI sandbox.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.error || data.errors) {
      const errorMsg = data.error?.message || data.errors?.[0]?.message || 'API error';
      console.error('LiteAPI error response:', JSON.stringify(data));
      return new Response(JSON.stringify({ 
        error: errorMsg,
        errorCode: 'API_ERROR',
        message: `LiteAPI returned: "${errorMsg}". The sandbox API has limited functionality. For production use, consider Amadeus or Skyscanner.`,
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no flights found
    if (!data?.data || data.data.length === 0) {
      console.log('LiteAPI returned no flights for this route');
      return new Response(JSON.stringify({ 
        flights: [],
        message: 'No flights found for this route and date. Try different dates or airports.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${data?.data?.length || 0} flight options for user ${userId}`);

    // Transform the response to a cleaner format
    const flights = (data?.data || []).map((option: any) => ({
      id: option.id || crypto.randomUUID(),
      price: option.price?.total || option.price?.net || 0,
      currency: option.price?.currency || 'USD',
      itineraries: option.itineraries?.map((itinerary: any) => ({
        segments: itinerary.segments?.map((segment: any) => ({
          departureAirport: segment.departure?.iataCode || segment.origin,
          departureTime: segment.departure?.at || segment.departureTime,
          arrivalAirport: segment.arrival?.iataCode || segment.destination,
          arrivalTime: segment.arrival?.at || segment.arrivalTime,
          airline: segment.carrierCode || segment.airline,
          flightNumber: segment.flightNumber ? `${segment.carrierCode || ''}${segment.flightNumber}` : segment.flight,
          duration: segment.duration,
          stops: segment.numberOfStops || 0,
          cabin: segment.cabin,
        })) || [],
      })) || [],
    }));

    return new Response(JSON.stringify({ flights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in search-flights function:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      errorCode: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      flights: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});