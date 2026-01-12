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
    const query = `
      query {
        liteapi {
          search(criteria: {
            origin: "${origin}",
            destination: "${destination}",
            departureDate: "${departureDate}",
            ${returnDate && tripType === 'roundtrip' ? `returnDate: "${returnDate}",` : ''}
            pax: { adults: ${passengers}, children: 0 },
            currency: "USD"
          }) {
            options {
              id
              price { net, currency }
              itineraries {
                segments {
                  departure { iataCode, at }
                  arrival { iataCode, at }
                  carrierCode
                  flightNumber
                  duration
                  numberOfStops
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.liteapi.travel/v3.0/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': liteApiKey,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('LiteAPI errors:', JSON.stringify(data.errors));
      throw new Error(data.errors[0]?.message || 'Failed to search flights');
    }

    console.log(`Found ${data?.data?.liteapi?.search?.options?.length || 0} flight options`);

    // Transform the response to a cleaner format
    const flights = data?.data?.liteapi?.search?.options?.map((option: any) => ({
      id: option.id,
      price: option.price?.net,
      currency: option.price?.currency || 'USD',
      itineraries: option.itineraries?.map((itinerary: any) => ({
        segments: itinerary.segments?.map((segment: any) => ({
          departureAirport: segment.departure?.iataCode,
          departureTime: segment.departure?.at,
          arrivalAirport: segment.arrival?.iataCode,
          arrivalTime: segment.arrival?.at,
          airline: segment.carrierCode,
          flightNumber: `${segment.carrierCode}${segment.flightNumber}`,
          duration: segment.duration,
          stops: segment.numberOfStops || 0,
        })),
      })),
    })) || [];

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
