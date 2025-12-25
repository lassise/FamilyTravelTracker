import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripDetails {
  destination: string;
  startDate: string;
  endDate: string;
  kidsAges: number[];
  interests: string[];
  pacePreference: string;
  budgetLevel: string;
  lodgingLocation?: string;
  napSchedule?: string;
  strollerNeeds?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tripDetails: TripDetails = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const startDate = new Date(tripDetails.startDate);
    const endDate = new Date(tripDetails.endDate);
    const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const systemPrompt = `You are an expert family travel planner specializing in trips with children. You create detailed, practical itineraries that account for kids' needs, energy levels, and attention spans.

Your itineraries should:
- Be realistic about timing and travel between locations
- Include kid-friendly meal suggestions at appropriate times
- Account for nap times and rest periods for younger children
- Suggest stroller-friendly options when relevant
- Include "Plan B" alternatives for bad weather or tired kids
- Group activities by proximity to minimize travel time
- Note which activities require reservations
- Include estimated costs and duration for each activity`;

    const userPrompt = `Create a ${tripDays}-day family travel itinerary for ${tripDetails.destination}.

Trip Details:
- Dates: ${tripDetails.startDate} to ${tripDetails.endDate}
- Kids' ages: ${tripDetails.kidsAges.join(', ')} years old
- Interests: ${tripDetails.interests.join(', ')}
- Pace preference: ${tripDetails.pacePreference}
- Budget level: ${tripDetails.budgetLevel}
${tripDetails.lodgingLocation ? `- Staying near: ${tripDetails.lodgingLocation}` : ''}
${tripDetails.napSchedule ? `- Nap schedule: ${tripDetails.napSchedule}` : ''}
${tripDetails.strollerNeeds ? '- Need stroller-friendly options' : ''}

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
          "description": "Why this is great for the family",
          "locationName": "Place name",
          "locationAddress": "Full address",
          "category": "attraction|restaurant|outdoor|museum|entertainment|transport|rest",
          "durationMinutes": 90,
          "costEstimate": 50,
          "isKidFriendly": true,
          "isStrollerFriendly": true,
          "requiresReservation": false,
          "reservationInfo": "How to book if needed"
        }
      ],
      "mealSuggestions": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "name": "Restaurant name",
          "description": "Why it's good for families",
          "priceRange": "$|$$|$$$",
          "kidFriendlyNotes": "What kids will like"
        }
      ],
      "planB": "Alternative plan for rain or tired kids",
      "notes": "Tips for this day"
    }
  ],
  "packingTips": ["List of items specific to this destination"],
  "generalTips": ["Overall trip tips for families"]
}

Ensure all times are realistic and include buffer time for transitions with kids. Return ONLY valid JSON, no additional text.`;

    console.log('Generating itinerary for:', tripDetails.destination);

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

    console.log('Successfully generated itinerary with', itinerary.days?.length, 'days');

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
