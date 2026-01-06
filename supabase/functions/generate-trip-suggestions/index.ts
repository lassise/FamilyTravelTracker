import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { request_type, preferences, visited_countries, wishlistCountries, visitedContinents, visitedCountries } = body;

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
          model: "google/gemini-2.5-flash",
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
      
      const prompt = `Create a ${days}-day travel itinerary for ${destination}.

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
          model: "google/gemini-2.5-flash",
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
        model: "google/gemini-2.5-flash",
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
