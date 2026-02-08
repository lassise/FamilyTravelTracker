// This function uses an AI model to intelligently parse travel documents
// and extract structured trip information.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for the structured response we want from the LLM
interface ExtractedTripData {
  trips: Array<{
    destination_country: string; // Full country name (e.g., "Greece")
    destination_city: string;    // Full city name (e.g., "Athens")
    start_date: string;          // ISO YYYY-MM-DD
    end_date: string;            // ISO YYYY-MM-DD
    trip_name: string;           // e.g., "Trip to Athens"
    source_text_snippet: string; // The part of the text that triggered this
  }>;
}

const systemPrompt = `You are an expert travel assistant. Your job is to analyze travel documents (boarding passes, hotel reservations, itineraries) and extract structured trip information.

CRITICAL RULES FOR DATES:
1. TRIP START DATE: This is the date the traveler ARRIVES in the destination country. 
   - If a flight leaves the home country on May 10 and lands in the destination on May 11, the 'start_date' MUST be May 11.
2. TRIP END DATE: This is the date the traveler DEPARTS from the destination country.
3. YEAR DETECTION: Look VERY carefully for the year (e.g., "2024"). If you see "2024" in the text near the dates, DO NOT use the current year (2026). Use the year found in the text.
4. DURATION: If you see "3 nights" or similar, ensure the date range matches that duration.

OTHER RULES:
- DESTINATION: Identify the final destination country and city. Ignore layovers in the 'homeCountry'.
- SOURCE: Identify if this is a 'flight', 'hotel', or 'general' itinerary.
- OUTPUT: Return ONLY a valid JSON object with a "trips" array.`;

const buildUserPrompt = (text: string, homeCountry?: string) => `
Analyze this travel document:
Home Country: ${homeCountry || 'Not Specified'}
Current Year (for reference only): 2026

DOCUMENT TEXT:
${text}

Return JSON with "trips" array.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, homeCountry } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('No text provided to analyze');
    }

    // Get the Google Gemini API Key
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      console.error("Missing Gemini API key configuration");
      throw new Error('Server configuration error: GEMINI_API_KEY missing');
    }

    // Call Google Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${buildUserPrompt(text, homeCountry)}`
          }]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API Error:", err);
      throw new Error(`AI analysis failed: ${response.statusText}`);
    }

    const aiData = await response.json();
    const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("Gemini returned empty response");
    }

    // Parse the JSON result
    let extractedData;
    try {
      extractedData = JSON.parse(resultText);
    } catch (e) {
      // Fallback if model returned markdown block
      const cleanJson = resultText.replace(/```json\n?|\n?```/g, '');
      extractedData = JSON.parse(cleanJson);
    }

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
