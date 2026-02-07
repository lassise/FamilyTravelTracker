import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceAlertRequest {
  savedFlightId: string;
  currentPrice: number;
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { savedFlightId, currentPrice, origin, destination, outboundDate, returnDate }: PriceAlertRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if the request is using the Service Role Key (Admin/Cron)
    const isServiceRole = authHeader.includes(supabaseServiceKey);
    let requestingUserId: string | null = null;

    if (!isServiceRole) {
      // If not service role, verify user token
      const supabaseAuth = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      requestingUserId = user.id;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing price alert for flight:", savedFlightId, "Current price:", currentPrice);

    // Get the saved flight and user info
    const { data: savedFlight, error: flightError } = await supabase
      .from("saved_flights")
      .select("*, profiles!saved_flights_user_id_fkey(email, full_name)")
      .eq("id", savedFlightId)
      .single();

    if (flightError || !savedFlight) {
      console.error("Failed to fetch saved flight:", flightError);
      return new Response(JSON.stringify({ error: "Flight not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization Check: checks if the requesting user owns this flight
    if (requestingUserId && savedFlight.user_id !== requestingUserId) {
      console.warn(`Unauthorized attempt by ${requestingUserId} to access flight ${savedFlightId}`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if price alert is enabled and if price dropped below target
    if (!savedFlight.price_alert_enabled || !savedFlight.target_price) {
      return new Response(JSON.stringify({ message: "No active price alert" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetPrice = savedFlight.target_price;
    const lastPrice = savedFlight.last_price || currentPrice;
    const email = savedFlight.alert_email || savedFlight.profiles?.email;

    if (!email) {
      console.error("No email address found for alert");
      return new Response(JSON.stringify({ error: "No email for alert" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the last price
    await supabase
      .from("saved_flights")
      .update({ last_price: currentPrice, updated_at: new Date().toISOString() })
      .eq("id", savedFlightId);

    // Only send email if price dropped below target
    if (currentPrice <= targetPrice) {
      const savings = lastPrice - currentPrice;
      const userName = savedFlight.profiles?.full_name || "Traveler";

      console.log("Sending price alert email to:", email);

      const emailResponse = await resend.emails.send({
        from: "Flight Alerts <onboarding@resend.dev>",
        to: [email],
        subject: `✈️ Price Drop Alert: ${origin} → ${destination} now $${currentPrice}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
              .price-box { background: white; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .current-price { font-size: 48px; font-weight: bold; color: #10b981; }
              .savings { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
              .flight-details { background: white; border-radius: 12px; padding: 20px; margin: 20px 0; }
              .route { font-size: 24px; font-weight: bold; color: #1e293b; }
              .dates { color: #64748b; margin-top: 8px; }
              .cta-button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🎉 Price Alert!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Great news, ${userName}!</p>
              </div>
              <div class="content">
                <div class="price-box">
                  <div class="current-price">$${currentPrice}</div>
                  ${savings > 0 ? `<div class="savings">💰 Save $${savings.toFixed(0)} from last check!</div>` : ''}
                </div>
                
                <div class="flight-details">
                  <div class="route">${origin} → ${destination}</div>
                  <div class="dates">
                    📅 ${outboundDate}${returnDate ? ` - ${returnDate}` : ' (One-way)'}
                  </div>
                </div>
                
                <p>Your target price was <strong>$${targetPrice}</strong> and flights are now available at <strong>$${currentPrice}</strong>!</p>
                
                <center>
                  <a href="https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20from%20${origin}%20on%20${outboundDate}" class="cta-button">
                    Book Now on Google Flights →
                  </a>
                </center>
                
                <div class="footer">
                  <p>You're receiving this because you set up a price alert on Family on the Fly.</p>
                  <p>To stop receiving these alerts, visit your saved flights and disable the price alert.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify({
        success: true,
        message: "Price alert email sent",
        emailResponse
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      message: "Price not below target",
      currentPrice,
      targetPrice
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-price-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
