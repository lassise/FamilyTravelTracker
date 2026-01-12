import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const liteApiKey = Deno.env.get('LITEAPI_SANDBOX_KEY');
    if (!liteApiKey) {
      console.error('LITEAPI_SANDBOX_KEY not configured');
      throw new Error('LiteAPI key not configured');
    }

    const { origin, destination, departureDate, returnDate, passengers, tripType } = await req.json();

    console.log(`Searching flights: ${origin} -> ${destination}, ${departureDate}${returnDate ? ` - ${returnDate}` : ''}, ${passengers} passengers`);

    // LiteAPI GraphQL query for flight search
    // Use REST API instead of GraphQL for more reliable response handling
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

    const response = await fetch(`https://api.liteapi.travel/v3.0/flights/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': liteApiKey,
      },
    });

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LiteAPI HTTP error:', response.status, errorText);
      throw new Error(`Flight API returned ${response.status}: ${errorText || 'Unknown error'}`);
    }

    const responseText = await response.text();
    
    // Handle empty responses
    if (!responseText || responseText.trim() === '') {
      console.log('LiteAPI returned empty response - no flights found');
      return new Response(JSON.stringify({ flights: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse LiteAPI response:', responseText.substring(0, 500));
      throw new Error('Invalid response from flight API');
    }

    if (data.error || data.errors) {
      const errorMsg = data.error?.message || data.errors?.[0]?.message || 'Failed to search flights';
      console.error('LiteAPI error response:', JSON.stringify(data));
      throw new Error(errorMsg);
    }

    console.log(`Found ${data?.data?.length || 0} flight options`);

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
    }));

    return new Response(JSON.stringify({ flights }), {
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
