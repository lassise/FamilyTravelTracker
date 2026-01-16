import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Demo account credentials - this is a shared read-only demo account
const DEMO_EMAIL = "demo@familyonthefly.app";
const DEMO_PASSWORD = "demo-user-2024!";

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 demo logins per hour per IP
const RATE_LIMIT_WINDOW_MINUTES = 60;

// Check rate limit based on IP address
async function checkIPRateLimit(
  serviceClient: any,
  clientIp: string,
  functionName: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Check existing rate limit record
  const { data: rateLimitData, error: fetchError } = await serviceClient
    .from('api_rate_limits')
    .select('*')
    .eq('user_id', clientIp) // Using user_id field to store IP
    .eq('function_name', functionName)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Rate limit check error:', fetchError);
    // Allow request on error to not block legitimate users
    return { allowed: true };
  }

  if (rateLimitData) {
    const recordWindowStart = new Date(rateLimitData.window_start);
    
    // Check if within current window and over limit
    if (recordWindowStart >= windowStart && rateLimitData.request_count >= maxRequests) {
      const resetTime = recordWindowStart.getTime() + windowMinutes * 60 * 1000;
      const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);
      return { allowed: false, retryAfterSeconds };
    }
    
    // Update the record
    if (recordWindowStart < windowStart) {
      // Window expired, reset counter
      await serviceClient
        .from('api_rate_limits')
        .update({ 
          request_count: 1, 
          window_start: new Date().toISOString() 
        })
        .eq('id', rateLimitData.id);
    } else {
      // Increment counter
      await serviceClient
        .from('api_rate_limits')
        .update({ 
          request_count: rateLimitData.request_count + 1 
        })
        .eq('id', rateLimitData.id);
    }
  } else {
    // Create new rate limit record
    await serviceClient.from('api_rate_limits').insert({
      user_id: clientIp,
      function_name: functionName,
      request_count: 1,
      window_start: new Date().toISOString()
    });
  }

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client to manage demo user and check rate limits
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
                  || req.headers.get('x-real-ip') 
                  || 'unknown';

    // Check rate limit
    if (clientIp !== 'unknown') {
      const rateLimit = await checkIPRateLimit(
        adminClient,
        clientIp,
        'demo-login',
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_WINDOW_MINUTES
      );

      if (!rateLimit.allowed) {
        console.log(`Rate limit exceeded for IP: ${clientIp.substring(0, 8)}...`);
        return new Response(
          JSON.stringify({ 
            error: 'Too many demo login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfterSeconds 
          }),
          {
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": String(rateLimit.retryAfterSeconds || 60)
            },
            status: 429,
          }
        );
      }
    }

    // Check if demo user exists, if not create it
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let demoUser = existingUsers?.users.find(u => u.email === DEMO_EMAIL);

    if (!demoUser) {
      // Create demo user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: "Demo Traveler",
        }
      });

      if (createError) {
        console.error("Error creating demo user:", createError);
        throw new Error("Failed to create demo user");
      }

      demoUser = newUser.user;

      // Seed demo data for the new user
      await seedDemoData(adminClient, demoUser.id);
    }

    // Create a regular client to sign in
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sign in as demo user
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signInError) {
      console.error("Error signing in demo user:", signInError);
      throw new Error("Failed to sign in demo user");
    }

    console.log(`Demo login successful for IP: ${clientIp.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        session: signInData.session,
        user: signInData.user,
        message: "Welcome to the demo! Feel free to explore all features.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Demo login error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Demo login failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function seedDemoData(client: any, userId: string) {
  try {
    // Add some family members
    const familyMembers = [
      { user_id: userId, name: "Demo Parent", role: "Parent", avatar: "👨", color: "#6366f1" },
      { user_id: userId, name: "Demo Partner", role: "Parent", avatar: "👩", color: "#ec4899" },
      { user_id: userId, name: "Alex", role: "Child", avatar: "👦", color: "#22c55e" },
      { user_id: userId, name: "Emma", role: "Child", avatar: "👧", color: "#f59e0b" },
    ];

    const { data: members } = await client.from("family_members").insert(familyMembers).select();

    // Add some countries the demo family has visited
    const countries = [
      { user_id: userId, name: "France", flag: "🇫🇷", continent: "Europe" },
      { user_id: userId, name: "Japan", flag: "🇯🇵", continent: "Asia" },
      { user_id: userId, name: "United States", flag: "🇺🇸", continent: "North America" },
      { user_id: userId, name: "Italy", flag: "🇮🇹", continent: "Europe" },
      { user_id: userId, name: "Thailand", flag: "🇹🇭", continent: "Asia" },
      { user_id: userId, name: "Mexico", flag: "🇲🇽", continent: "North America" },
      { user_id: userId, name: "Spain", flag: "🇪🇸", continent: "Europe" },
      { user_id: userId, name: "Australia", flag: "🇦🇺", continent: "Oceania" },
    ];

    const { data: insertedCountries } = await client.from("countries").insert(countries).select();

    if (insertedCountries && members) {
      // Add country visits for family members
      const visits = [];
      for (const country of insertedCountries) {
        for (const member of members) {
          visits.push({
            user_id: userId,
            country_id: country.id,
            family_member_id: member.id,
          });
        }
      }
      await client.from("country_visits").insert(visits);

      // Add some visit details with realistic past dates (not future)
      const now = new Date();
      const visitDetails = [
        {
          user_id: userId,
          country_id: insertedCountries[0].id, // France
          trip_name: "Paris Spring Break 2023",
          visit_date: "2023-04-10",
          end_date: "2023-04-20",
          number_of_days: 10,
          highlight: "Eiffel Tower at sunset",
          why_it_mattered: "First international trip as a family",
          notes: "Amazing croissants and the kids loved the Louvre!",
        },
        {
          user_id: userId,
          country_id: insertedCountries[1].id, // Japan
          trip_name: "Tokyo Cherry Blossom Adventure",
          visit_date: "2024-03-25",
          end_date: "2024-04-05",
          number_of_days: 11,
          highlight: "Cherry blossoms in Ueno Park",
          why_it_mattered: "Cultural immersion experience",
          notes: "Kids fell in love with Japanese culture and food!",
        },
        {
          user_id: userId,
          country_id: insertedCountries[3].id, // Italy
          trip_name: "Rome & Tuscany Summer 2024",
          visit_date: "2024-07-15",
          end_date: "2024-07-28",
          number_of_days: 13,
          highlight: "Colosseum tour with gladiator experience",
          why_it_mattered: "History came alive for the kids",
          notes: "Best gelato ever!",
        },
        {
          user_id: userId,
          country_id: insertedCountries[4].id, // Thailand
          trip_name: "Thai Beach Holiday",
          visit_date: "2024-12-20",
          end_date: "2025-01-02",
          number_of_days: 13,
          highlight: "Swimming with elephants at ethical sanctuary",
          notes: "Beautiful beaches and amazing food",
        },
        {
          user_id: userId,
          country_id: insertedCountries[5].id, // Mexico
          trip_name: "Cancun Family Getaway",
          visit_date: "2022-06-10",
          end_date: "2022-06-18",
          number_of_days: 8,
          highlight: "Snorkeling in the Caribbean",
          notes: "Kids loved the all-inclusive resort",
        },
        {
          user_id: userId,
          country_id: insertedCountries[6].id, // Spain
          trip_name: "Barcelona Summer 2021",
          visit_date: "2021-08-01",
          end_date: "2021-08-10",
          number_of_days: 9,
          highlight: "Sagrada Familia was breathtaking",
          notes: "Great tapas and beach time",
        },
        {
          user_id: userId,
          country_id: insertedCountries[7].id, // Australia
          trip_name: "Sydney & Melbourne Adventure",
          visit_date: "2020-01-15",
          end_date: "2020-01-30",
          number_of_days: 15,
          highlight: "Great Barrier Reef diving",
          why_it_mattered: "Once in a lifetime experience",
          notes: "Koalas and kangaroos everywhere!",
        },
      ];
      
      const { data: insertedVisitDetails } = await client.from("country_visit_details").insert(visitDetails).select();
      
      // Link visit details to family members (visit_family_members table)
      if (insertedVisitDetails) {
        const visitFamilyMembers = [];
        for (const visit of insertedVisitDetails) {
          // All family members on most trips
          for (const member of members) {
            visitFamilyMembers.push({
              user_id: userId,
              visit_id: visit.id,
              family_member_id: member.id,
            });
          }
        }
        await client.from("visit_family_members").insert(visitFamilyMembers);
      }
    }

    // Add wishlist countries
    const wishlistCountries = [
      { user_id: userId, name: "New Zealand", flag: "🇳🇿", continent: "Oceania" },
      { user_id: userId, name: "Iceland", flag: "🇮🇸", continent: "Europe" },
      { user_id: userId, name: "Peru", flag: "🇵🇪", continent: "South America" },
    ];

    const { data: wishlistInserted } = await client.from("countries").insert(wishlistCountries).select();
    if (wishlistInserted) {
      await client.from("country_wishlist").insert(
        wishlistInserted.map((c: any) => ({ user_id: userId, country_id: c.id }))
      );
    }

    // Add sample trips - one past, one current, one near future, one far future
    const trips = [
      {
        user_id: userId,
        title: "Greece Island Hopping",
        destination: "Athens & Santorini, Greece",
        start_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        end_date: new Date(Date.now() + 375 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "planning",
        trip_type: "family",
        budget_total: 8000,
        currency: "USD",
        interests: ["beaches", "history", "culture", "food"],
        kids_ages: [9, 13],
        pace_preference: "relaxed",
        notes: "Dream trip to the Greek islands - saving up for this one!",
        cover_image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800",
      },
      {
        user_id: userId,
        title: "Summer in Barcelona",
        destination: "Barcelona, Spain",
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        end_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "planning",
        trip_type: "family",
        budget_total: 5000,
        currency: "USD",
        interests: ["beaches", "culture", "food"],
        kids_ages: [8, 12],
        pace_preference: "relaxed",
        notes: "Looking forward to exploring the city and beaches!",
        cover_image: "https://images.unsplash.com/photo-1583422409516-2895a77efced?w=800",
      },
    ];
    
    await client.from("trips").insert(trips);

    // Update profile with home country
    await client.from("profiles").update({
      full_name: "Demo Traveler",
      home_country: "United States",
      onboarding_completed: true,
    }).eq("id", userId);

    // Add travel settings
    await client.from("travel_settings").upsert({
      user_id: userId,
      home_country: "United States",
      home_country_code: "US",
    });

    console.log("Demo data seeded successfully for user:", userId);
  } catch (error) {
    console.error("Error seeding demo data:", error);
    // Don't throw - demo user was created successfully, just data seeding failed
  }
}
