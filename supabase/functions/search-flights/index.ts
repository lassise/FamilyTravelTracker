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

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    
    // If no API key configured
    if (!serpApiKey) {
      console.log('No SerpAPI key configured');
      return new Response(JSON.stringify({ 
        error: 'Flight search not configured',
        errorCode: 'NO_API_KEY',
        message: 'SerpAPI key is not configured. Please add your SERPAPI_KEY to enable flight search.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SerpAPI Google Flights endpoint
    const searchParams = new URLSearchParams({
      api_key: serpApiKey,
      engine: 'google_flights',
      departure_id: origin,
      arrival_id: destination,
      outbound_date: departureDate,
      adults: String(passengers),
      currency: 'USD',
      hl: 'en',
      type: tripType === 'roundtrip' ? '1' : '2', // 1 = round trip, 2 = one way
    });
    
    if (returnDate && tripType === 'roundtrip') {
      searchParams.append('return_date', returnDate);
    }

    console.log(`Calling SerpAPI Google Flights: ${origin} -> ${destination}`);

    let response;
    try {
      response = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (fetchError) {
      console.error('Network error calling SerpAPI:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to flight search API',
        errorCode: 'NETWORK_ERROR',
        message: 'Unable to reach SerpAPI. Please check your internet connection.',
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
        message: 'The flight API returned an unreadable response.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if response is ok
    if (!response.ok) {
      console.error('SerpAPI HTTP error:', response.status, responseText.substring(0, 500));
      
      return new Response(JSON.stringify({ 
        error: `Flight API returned error (HTTP ${response.status})`,
        errorCode: 'API_ERROR',
        message: `SerpAPI returned an error. This could mean the API key is invalid or you've exceeded rate limits.`,
        details: responseText.substring(0, 200),
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle empty responses
    if (!responseText || responseText.trim() === '') {
      console.log('SerpAPI returned empty response');
      return new Response(JSON.stringify({ 
        error: 'No data returned from flight API',
        errorCode: 'EMPTY_RESPONSE',
        message: 'SerpAPI returned no data for this search.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse SerpAPI response:', responseText.substring(0, 500));
      return new Response(JSON.stringify({ 
        error: 'Invalid response from flight API',
        errorCode: 'PARSE_ERROR',
        message: 'SerpAPI returned malformed data.',
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for SerpAPI errors
    if (data.error) {
      console.error('SerpAPI error response:', data.error);
      return new Response(JSON.stringify({ 
        error: data.error,
        errorCode: 'API_ERROR',
        message: `SerpAPI error: ${data.error}`,
        flights: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SerpAPI returns flights in different structures
    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    // If no flights found
    if (allFlights.length === 0) {
      console.log('SerpAPI returned no flights for this route');
      return new Response(JSON.stringify({ 
        flights: [],
        message: 'No flights found for this route and date. Try different dates or airports.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${allFlights.length} flight options (${bestFlights.length} best, ${otherFlights.length} other) for user ${userId}`);

    // Transform SerpAPI response to our format
    const flights = allFlights.map((flight: any, index: number) => {
      const flightLegs = flight.flights || [];
      
      // Calculate total duration from layovers info or sum of flight durations
      const totalDuration = flight.total_duration || flightLegs.reduce((sum: number, leg: any) => sum + (leg.duration || 0), 0);
      
      // Determine number of stops
      const stops = flightLegs.length - 1;
      
      return {
        id: `serpapi-${index}-${Date.now()}`,
        price: flight.price || 0,
        currency: 'USD',
        totalDuration,
        stops,
        isBestFlight: index < bestFlights.length,
        carbonEmissions: flight.carbon_emissions?.this_flight,
        itineraries: [{
          segments: flightLegs.map((leg: any) => ({
            departureAirport: leg.departure_airport?.id || origin,
            departureTime: leg.departure_airport?.time || '',
            arrivalAirport: leg.arrival_airport?.id || destination,
            arrivalTime: leg.arrival_airport?.time || '',
            airline: leg.airline || 'Unknown',
            airlineLogo: leg.airline_logo,
            flightNumber: leg.flight_number || '',
            duration: leg.duration || 0,
            stops: 0,
            cabin: leg.travel_class || 'Economy',
            airplane: leg.airplane,
            legroom: leg.legroom,
            extensions: leg.extensions || [],
            overnight: leg.overnight || false,
          })),
        }],
        layovers: flight.layovers?.map((layover: any) => ({
          airport: layover.id,
          airportName: layover.name,
          duration: layover.duration,
          overnight: layover.overnight || false,
        })) || [],
        extensions: flight.extensions || [],
        bookingToken: flight.booking_token,
      };
    });

    return new Response(JSON.stringify({ 
      flights,
      searchMetadata: {
        departure: data.search_parameters?.departure_id,
        arrival: data.search_parameters?.arrival_id,
        outboundDate: data.search_parameters?.outbound_date,
        returnDate: data.search_parameters?.return_date,
      }
    }), {
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