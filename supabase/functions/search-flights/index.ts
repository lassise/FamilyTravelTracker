import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlternateAirport {
  code: string;
  name: string;
  minSavings: number;
}

interface SearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  tripType: 'roundtrip' | 'oneway';
  alternateAirports?: AlternateAirport[];
}

async function searchFlightsFromOrigin(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string | undefined,
  passengers: number,
  tripType: string,
  serpApiKey: string,
  isAlternate: boolean = false,
  minSavings: number = 0
): Promise<{ flights: any[]; error?: string }> {
  const searchParams = new URLSearchParams({
    api_key: serpApiKey,
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departureDate,
    adults: String(passengers),
    currency: 'USD',
    hl: 'en',
    type: tripType === 'roundtrip' ? '1' : '2',
  });
  
  if (returnDate && tripType === 'roundtrip') {
    searchParams.append('return_date', returnDate);
  }

  console.log(`Searching flights from ${origin} -> ${destination}`);

  try {
    const response = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`SerpAPI HTTP error for ${origin}:`, response.status);
      return { flights: [], error: `HTTP ${response.status}` };
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return { flights: [], error: 'Empty response' };
    }

    const data = JSON.parse(responseText);
    if (data.error) {
      return { flights: [], error: data.error };
    }

    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    // Transform flights and tag with origin info
    const flights = allFlights.map((flight: any, index: number) => {
      const flightLegs = flight.flights || [];
      const totalDuration = flight.total_duration || flightLegs.reduce((sum: number, leg: any) => sum + (leg.duration || 0), 0);
      const stops = flightLegs.length - 1;
      
      return {
        id: `serpapi-${origin}-${index}-${Date.now()}`,
        price: flight.price || 0,
        currency: 'USD',
        totalDuration,
        stops,
        isBestFlight: index < bestFlights.length,
        carbonEmissions: flight.carbon_emissions?.this_flight,
        departureAirport: origin,
        isAlternateOrigin: isAlternate,
        minSavingsRequired: minSavings,
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

    return { flights };
  } catch (error) {
    console.error(`Error searching flights from ${origin}:`, error);
    return { flights: [], error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { 
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      passengers, 
      tripType,
      alternateAirports = []
    }: SearchRequest = await req.json();

    console.log(`User ${userId} searching flights: ${origin} -> ${destination}, ${departureDate}${returnDate ? ` - ${returnDate}` : ''}, ${passengers} passengers`);
    if (alternateAirports.length > 0) {
      console.log(`Also checking ${alternateAirports.length} alternate airports:`, alternateAirports.map(a => a.code).join(', '));
    }

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    
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

    // Search from primary origin
    const primarySearch = searchFlightsFromOrigin(
      origin, destination, departureDate, returnDate, passengers, tripType, serpApiKey, false, 0
    );

    // Search from alternate airports in parallel
    const alternateSearches = alternateAirports.map(alt => 
      searchFlightsFromOrigin(
        alt.code, destination, departureDate, returnDate, passengers, tripType, serpApiKey, true, alt.minSavings
      )
    );

    // Wait for all searches to complete
    const [primaryResult, ...alternateResults] = await Promise.all([primarySearch, ...alternateSearches]);

    // Combine all flights
    let allFlights = [...primaryResult.flights];
    
    // Find cheapest primary flight for comparison
    const cheapestPrimary = primaryResult.flights.length > 0 
      ? Math.min(...primaryResult.flights.map((f: any) => f.price))
      : Infinity;

    // Add alternate flights that meet savings threshold
    alternateResults.forEach((result, index) => {
      if (result.flights.length > 0) {
        const altAirport = alternateAirports[index];
        const qualifyingFlights = result.flights.filter((f: any) => {
          const savings = cheapestPrimary - f.price;
          return savings >= altAirport.minSavings;
        });
        
        console.log(`${altAirport.code}: ${result.flights.length} flights found, ${qualifyingFlights.length} meet $${altAirport.minSavings} savings threshold`);
        allFlights = [...allFlights, ...qualifyingFlights];
      }
    });

    // Sort by price
    allFlights.sort((a: any, b: any) => a.price - b.price);

    if (allFlights.length === 0) {
      console.log('No flights found for any origin');
      return new Response(JSON.stringify({ 
        flights: [],
        message: 'No flights found for this route and date. Try different dates or airports.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${allFlights.length} total flight options for user ${userId}`);

    return new Response(JSON.stringify({ 
      flights: allFlights,
      searchMetadata: {
        primaryOrigin: origin,
        alternateOrigins: alternateAirports.map(a => a.code),
        destination,
        outboundDate: departureDate,
        returnDate,
        cheapestPrimaryPrice: cheapestPrimary === Infinity ? null : cheapestPrimary,
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
