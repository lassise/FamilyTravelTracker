import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate demo flights when API fails or returns empty
function generateDemoFlights(origin: string, destination: string, departureDate: string, returnDate: string | null, passengers: number) {
  const airlines = [
    { code: 'AA', name: 'American Airlines' },
    { code: 'DL', name: 'Delta Air Lines' },
    { code: 'UA', name: 'United Airlines' },
    { code: 'WN', name: 'Southwest Airlines' },
    { code: 'B6', name: 'JetBlue Airways' },
    { code: 'AS', name: 'Alaska Airlines' },
  ];

  const flights = [];
  const basePrice = 150 + Math.random() * 300;
  
  // Generate 6-10 flight options
  const numFlights = 6 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < numFlights; i++) {
    const airline = airlines[i % airlines.length];
    const departHour = 6 + Math.floor(Math.random() * 14);
    const flightDurationHours = 2 + Math.floor(Math.random() * 4);
    const stops = Math.random() > 0.6 ? 1 : 0;
    const priceMultiplier = 0.8 + Math.random() * 0.6;
    
    const departTime = new Date(departureDate);
    departTime.setHours(departHour, Math.floor(Math.random() * 60));
    
    const arriveTime = new Date(departTime);
    arriveTime.setHours(arriveTime.getHours() + flightDurationHours + (stops ? 1 : 0));
    
    const itineraries = [{
      segments: [{
        departureAirport: origin,
        departureTime: departTime.toISOString(),
        arrivalAirport: destination,
        arrivalTime: arriveTime.toISOString(),
        airline: airline.code,
        flightNumber: `${airline.code}${100 + Math.floor(Math.random() * 900)}`,
        duration: `PT${flightDurationHours}H${Math.floor(Math.random() * 60)}M`,
        stops: stops,
      }]
    }];
    
    // Add return flight if round trip
    if (returnDate) {
      const returnDepartHour = 6 + Math.floor(Math.random() * 14);
      const returnDepartTime = new Date(returnDate);
      returnDepartTime.setHours(returnDepartHour, Math.floor(Math.random() * 60));
      
      const returnArriveTime = new Date(returnDepartTime);
      returnArriveTime.setHours(returnArriveTime.getHours() + flightDurationHours + (stops ? 1 : 0));
      
      itineraries.push({
        segments: [{
          departureAirport: destination,
          departureTime: returnDepartTime.toISOString(),
          arrivalAirport: origin,
          arrivalTime: returnArriveTime.toISOString(),
          airline: airline.code,
          flightNumber: `${airline.code}${100 + Math.floor(Math.random() * 900)}`,
          duration: `PT${flightDurationHours}H${Math.floor(Math.random() * 60)}M`,
          stops: stops,
        }]
      });
    }
    
    flights.push({
      id: crypto.randomUUID(),
      price: Math.round((basePrice * priceMultiplier * passengers) * 100) / 100,
      currency: 'USD',
      itineraries,
      isDemo: true,
    });
  }
  
  // Sort by price
  flights.sort((a, b) => a.price - b.price);
  
  return flights;
}

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
    
    // If no API key, return demo flights
    if (!liteApiKey) {
      console.log('No API key configured, returning demo flights');
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flight options (demo mode)',
        isDemo: true 
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
      // Return demo flights on network error
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flights (live API temporarily unavailable)',
        isDemo: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }
      console.error('LiteAPI HTTP error:', response.status, errorText);
      
      // Return demo flights on API error
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flights (API returned error)',
        isDemo: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      console.log('Could not read response text, returning demo flights');
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flights',
        isDemo: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle empty responses
    if (!responseText || responseText.trim() === '') {
      console.log('LiteAPI returned empty response - returning demo flights');
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flights for this route',
        isDemo: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse LiteAPI response:', responseText.substring(0, 500));
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flights',
        isDemo: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.error || data.errors) {
      const errorMsg = data.error?.message || data.errors?.[0]?.message || 'API error';
      console.error('LiteAPI error response:', JSON.stringify(data));
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: `Showing sample flights (${errorMsg})`,
        isDemo: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no flights from API, return demo flights
    if (!data?.data || data.data.length === 0) {
      console.log('LiteAPI returned no flights, returning demo flights');
      const demoFlights = generateDemoFlights(origin, destination, departureDate, returnDate, passengers);
      return new Response(JSON.stringify({ 
        flights: demoFlights, 
        message: 'Showing sample flights for this route',
        isDemo: true 
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
        })) || [],
      })) || [],
      isDemo: false,
    }));

    return new Response(JSON.stringify({ flights, isDemo: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in search-flights function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
