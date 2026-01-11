import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Demo account credentials - this is a shared read-only demo account
const DEMO_EMAIL = "demo@familyonthefly.app";
const DEMO_PASSWORD = "demo-user-2024!";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client to manage demo user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

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

      // Add some visit details
      const visitDetails = insertedCountries.map((country: any, index: number) => ({
        user_id: userId,
        country_id: country.id,
        trip_name: `${country.name} Adventure ${2020 + index}`,
        visit_date: new Date(2020 + index, 5, 15).toISOString().split('T')[0],
        end_date: new Date(2020 + index, 5, 25).toISOString().split('T')[0],
        number_of_days: 10,
        notes: `Amazing family trip to ${country.name}!`,
      }));
      await client.from("country_visit_details").insert(visitDetails);
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

    // Add a sample trip
    await client.from("trips").insert({
      user_id: userId,
      title: "Summer in Barcelona",
      destination: "Barcelona, Spain",
      start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "planning",
      trip_type: "family",
      budget_total: 5000,
      currency: "USD",
      interests: ["beaches", "culture", "food"],
      kids_ages: [8, 12],
      pace_preference: "relaxed",
      notes: "Looking forward to exploring the city and beaches!",
    });

    // Update profile with home country
    await client.from("profiles").update({
      full_name: "Demo Traveler",
      home_country: "United States",
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
