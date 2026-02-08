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
            text: `${systemPrompt}\n\n${userPrompt}`
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
