import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Country to continent mapping
const countryToContinentMap: Record<string, string> = {
  // Africa
  DZ: "Africa", AO: "Africa", BJ: "Africa", BW: "Africa", BF: "Africa", BI: "Africa",
  CV: "Africa", CM: "Africa", CF: "Africa", TD: "Africa", KM: "Africa", CG: "Africa",
  CD: "Africa", DJ: "Africa", EG: "Africa", GQ: "Africa", ER: "Africa", SZ: "Africa",
  ET: "Africa", GA: "Africa", GM: "Africa", GH: "Africa", GN: "Africa", GW: "Africa",
  CI: "Africa", KE: "Africa", LS: "Africa", LR: "Africa", LY: "Africa", MG: "Africa",
  MW: "Africa", ML: "Africa", MR: "Africa", MU: "Africa", MA: "Africa", MZ: "Africa",
  NA: "Africa", NE: "Africa", NG: "Africa", RW: "Africa", ST: "Africa", SN: "Africa",
  SC: "Africa", SL: "Africa", SO: "Africa", ZA: "Africa", SS: "Africa", SD: "Africa",
  TZ: "Africa", TG: "Africa", TN: "Africa", UG: "Africa", ZM: "Africa", ZW: "Africa",
  // Asia
  AF: "Asia", AM: "Asia", AZ: "Asia", BH: "Asia", BD: "Asia", BT: "Asia", BN: "Asia",
  KH: "Asia", CN: "Asia", CY: "Asia", GE: "Asia", IN: "Asia", ID: "Asia", IR: "Asia",
  IQ: "Asia", IL: "Asia", JP: "Asia", JO: "Asia", KZ: "Asia", KW: "Asia", KG: "Asia",
  LA: "Asia", LB: "Asia", MY: "Asia", MV: "Asia", MN: "Asia", MM: "Asia", NP: "Asia",
  KP: "Asia", OM: "Asia", PK: "Asia", PS: "Asia", PH: "Asia", QA: "Asia", SA: "Asia",
  SG: "Asia", KR: "Asia", LK: "Asia", SY: "Asia", TW: "Asia", TJ: "Asia", TH: "Asia",
  TL: "Asia", TR: "Asia", TM: "Asia", AE: "Asia", UZ: "Asia", VN: "Asia", YE: "Asia",
  // Europe
  AL: "Europe", AD: "Europe", AT: "Europe", BY: "Europe", BE: "Europe", BA: "Europe",
  BG: "Europe", HR: "Europe", CZ: "Europe", DK: "Europe", EE: "Europe", FI: "Europe",
  FR: "Europe", DE: "Europe", GR: "Europe", HU: "Europe", IS: "Europe", IE: "Europe",
  IT: "Europe", XK: "Europe", LV: "Europe", LI: "Europe", LT: "Europe", LU: "Europe",
  MT: "Europe", MD: "Europe", MC: "Europe", ME: "Europe", NL: "Europe", MK: "Europe",
  NO: "Europe", PL: "Europe", PT: "Europe", RO: "Europe", RU: "Europe", SM: "Europe",
  RS: "Europe", SK: "Europe", SI: "Europe", ES: "Europe", SE: "Europe", CH: "Europe",
  UA: "Europe", GB: "Europe", VA: "Europe",
  // North America
  AG: "North America", BS: "North America", BB: "North America", BZ: "North America",
  CA: "North America", CR: "North America", CU: "North America", DM: "North America",
  DO: "North America", SV: "North America", GD: "North America", GT: "North America",
  HT: "North America", HN: "North America", JM: "North America", MX: "North America",
  NI: "North America", PA: "North America", KN: "North America", LC: "North America",
  VC: "North America", TT: "North America", US: "North America",
  // South America
  AR: "South America", BO: "South America", BR: "South America", CL: "South America",
  CO: "South America", EC: "South America", GY: "South America", PY: "South America",
  PE: "South America", SR: "South America", UY: "South America", VE: "South America",
  // Oceania
  AU: "Oceania", FJ: "Oceania", KI: "Oceania", MH: "Oceania", FM: "Oceania",
  NR: "Oceania", NZ: "Oceania", PW: "Oceania", PG: "Oceania", WS: "Oceania",
  SB: "Oceania", TO: "Oceania", TV: "Oceania", VU: "Oceania",
};

// Extract country code from flag emoji
function getCountryCodeFromFlag(flag: string): string | null {
  if (!flag || flag.length < 2) return null;
  const codePoints = [...flag].map((char) => char.codePointAt(0) || 0);
  if (codePoints.length >= 2 && codePoints[0] >= 0x1f1e6 && codePoints[0] <= 0x1f1ff) {
    const first = String.fromCharCode(codePoints[0] - 0x1f1e6 + 65);
    const second = String.fromCharCode(codePoints[1] - 0x1f1e6 + 65);
    return first + second;
  }
  return null;
}

/**
 * CANONICAL Edge Function for fetching public dashboard data
 * VERIFICATION: Logs all steps for debugging
 * TOKEN LOOKUP ORDER: share_links (canonical) → share_profiles (legacy fallback)
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    console.log("[get-public-dashboard] Received token:", token);

    // Normalize token: lowercase, trimmed, must be 32 hex chars
    const tokenNormalized = token?.trim().toLowerCase();
    if (!tokenNormalized || tokenNormalized.length !== 32 || !/^[a-f0-9]+$/.test(tokenNormalized)) {
      console.log("[get-public-dashboard] Invalid token format");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid or missing token",
          debug: { token_provided: !!token, token_length: token?.length, token_format_valid: false },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use SERVICE ROLE to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const debug: Record<string, unknown> = {
      token_normalized: tokenNormalized,
      token_found: false,
      token_source: "",
      owner_user_id: "",
      query_steps: [] as string[],
      query_counts: {} as Record<string, number>,
      failures: [] as string[],
    };

    let ownerId: string | null = null;
    let shareSettings: {
      show_stats: boolean;
      show_map: boolean;
      show_countries: boolean;
      show_photos: boolean;
      show_timeline: boolean;
      show_family_members: boolean;
      show_achievements: boolean;
      show_wishlist: boolean;
      include_memories: boolean; // Explicit memories flag for frontend
    } | null = null;

    // === Step 1: Try CANONICAL share_links table first ===
    (debug.query_steps as string[]).push("lookup_share_links");
    console.log("[get-public-dashboard] Looking up in share_links...");
    
    const { data: shareLink, error: shareLinkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", tokenNormalized)
      .eq("is_active", true)
      .maybeSingle();

    console.log("[get-public-dashboard] share_links result:", { shareLink, error: shareLinkError?.message });

    if (!shareLinkError && shareLink) {
      // Found in share_links table (canonical)
      debug.token_found = true;
      debug.token_source = "share_links.token";
      debug.owner_user_id = shareLink.owner_user_id;
      ownerId = shareLink.owner_user_id;

      // Update last_accessed_at
      await supabase
        .from("share_links")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", shareLink.id);

      // Convert share_links format to shareSettings
      shareSettings = {
        show_stats: shareLink.include_stats ?? true,
        show_map: true, // Always show map
        show_countries: shareLink.include_countries ?? true,
        show_photos: shareLink.include_memories ?? true,
        show_timeline: shareLink.include_memories ?? true, // Timeline = memories
        show_family_members: true, // Always show family members on public
        show_achievements: true, // Always show achievements
        show_wishlist: false, // Not in canonical system yet
        include_memories: shareLink.include_memories ?? true, // Explicit flag
      };
      console.log("[get-public-dashboard] Found in share_links, owner:", ownerId);
    } else {
      // === Step 2: Fallback to legacy share_profiles table ===
      (debug.query_steps as string[]).push("lookup_share_profiles");
      console.log("[get-public-dashboard] Falling back to share_profiles...");
      
      const { data: shareProfile, error: shareError } = await supabase
        .from("share_profiles")
        .select("*")
        .eq("dashboard_share_token", tokenNormalized)
        .eq("is_public", true)
        .maybeSingle();

      console.log("[get-public-dashboard] share_profiles result:", { shareProfile, error: shareError?.message });

      if (shareError || !shareProfile) {
        (debug.failures as string[]).push("share_link and share_profile not found");
        console.log("[get-public-dashboard] Token not found in either table");
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Share link not found or is private",
            debug,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      debug.token_found = true;
      debug.token_source = "share_profiles.dashboard_share_token";
      debug.owner_user_id = shareProfile.user_id;
      ownerId = shareProfile.user_id;
      
      shareSettings = {
        show_stats: shareProfile.show_stats ?? true,
        show_map: shareProfile.show_map ?? true,
        show_countries: shareProfile.show_countries ?? true,
        show_photos: shareProfile.show_photos ?? true,
        show_timeline: shareProfile.show_timeline ?? true,
        show_family_members: shareProfile.show_family_members ?? true,
        show_achievements: shareProfile.show_achievements ?? true,
        show_wishlist: shareProfile.show_wishlist ?? false,
        include_memories: shareProfile.show_timeline ?? true,
      };
      console.log("[get-public-dashboard] Found in share_profiles, owner:", ownerId);
    }

    if (!ownerId) {
      (debug.failures as string[]).push("owner_id not determined");
      return new Response(
        JSON.stringify({ ok: false, error: "Owner not found", debug }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Step 3: Fetch owner profile ===
    (debug.query_steps as string[]).push("fetch_owner_profile");
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, home_country")
      .eq("id", ownerId)
      .single();

    if (!ownerProfile) {
      (debug.failures as string[]).push("owner profile not found");
      return new Response(
        JSON.stringify({ ok: false, error: "Owner profile not found", debug }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[get-public-dashboard] Owner profile found:", ownerProfile.full_name);

    // === Step 4: Fetch all travel data ===
    
    // Countries
    (debug.query_steps as string[]).push("fetch_countries");
    const { data: countriesData } = await supabase
      .from("countries")
      .select("id, name, flag, continent")
      .eq("user_id", ownerId);
    const countries = countriesData || [];
    (debug.query_counts as Record<string, number>).countries = countries.length;

    // Country visits
    (debug.query_steps as string[]).push("fetch_country_visits");
    const { data: visitsData } = await supabase
      .from("country_visits")
      .select("country_id, family_member_id")
      .eq("user_id", ownerId);
    const visits = visitsData || [];
    (debug.query_counts as Record<string, number>).country_visits = visits.length;

    // Visit details (timeline data)
    (debug.query_steps as string[]).push("fetch_visit_details");
    const { data: visitDetailsData } = await supabase
      .from("country_visit_details")
      .select("id, country_id, visit_date, end_date, number_of_days, notes, approximate_year, approximate_month, is_approximate, trip_name, highlight, why_it_mattered")
      .eq("user_id", ownerId)
      .order("visit_date", { ascending: false, nullsFirst: false });
    const visitDetails = visitDetailsData || [];
    (debug.query_counts as Record<string, number>).visit_details = visitDetails.length;

    // Visit-family member mappings
    (debug.query_steps as string[]).push("fetch_visit_family_members");
    const { data: visitFamilyMembersData } = await supabase
      .from("visit_family_members")
      .select("visit_id, family_member_id")
      .eq("user_id", ownerId);
    const visitFamilyMembers = visitFamilyMembersData || [];
    (debug.query_counts as Record<string, number>).visit_family_members = visitFamilyMembers.length;

    // Family members (always fetch for filtering)
    (debug.query_steps as string[]).push("fetch_family_members");
    const { data: familyData } = await supabase
      .from("family_members")
      .select("id, name, role, avatar, color")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true });
    const familyMembers = familyData || [];
    (debug.query_counts as Record<string, number>).family_members = familyMembers.length;

    // State visits
    (debug.query_steps as string[]).push("fetch_state_visits");
    const { data: stateVisitsData } = await supabase
      .from("state_visits")
      .select("id, state_code, state_name, country_code, country_id, family_member_id, created_at")
      .eq("user_id", ownerId);
    const stateVisits = stateVisitsData || [];
    (debug.query_counts as Record<string, number>).state_visits = stateVisits.length;

    // Photos (only if memories/photos enabled)
    let photos: Array<{id: string; photo_url: string; caption: string | null; country_id: string | null; taken_at: string | null}> = [];
    if (shareSettings.show_photos || shareSettings.include_memories) {
      (debug.query_steps as string[]).push("fetch_photos");
      const { data: photosData } = await supabase
        .from("travel_photos")
        .select("id, photo_url, caption, country_id, taken_at")
        .eq("user_id", ownerId)
        .order("taken_at", { ascending: false, nullsFirst: false })
        .limit(50);
      photos = photosData || [];
      (debug.query_counts as Record<string, number>).photos = photos.length;
    }

    // === Step 5: Compute derived data ===
    
    // Visited country IDs
    const visitedCountryIds = new Set<string>();
    visits.forEach((v) => {
      if (v.country_id) visitedCountryIds.add(v.country_id);
    });
    visitDetails.forEach((vd) => {
      if (vd.country_id) visitedCountryIds.add(vd.country_id);
    });

    // Build visited-by mapping
    const visitedByMap: Record<string, string[]> = {};
    visits.forEach((v) => {
      if (!v.country_id) return;
      if (!visitedByMap[v.country_id]) visitedByMap[v.country_id] = [];
      if (v.family_member_id) {
        const member = familyMembers.find((m) => m.id === v.family_member_id);
        if (member && !visitedByMap[v.country_id].includes(member.name)) {
          visitedByMap[v.country_id].push(member.name);
        }
      } else if (!visitedByMap[v.country_id].includes("Visited")) {
        visitedByMap[v.country_id].push("Visited");
      }
    });

    // From visit_family_members
    const visitIdToCountryId: Record<string, string> = {};
    visitDetails.forEach((vd) => {
      if (vd.id && vd.country_id) visitIdToCountryId[vd.id] = vd.country_id;
    });

    visitFamilyMembers.forEach((vfm) => {
      const countryId = visitIdToCountryId[vfm.visit_id];
      if (!countryId) return;
      if (!visitedByMap[countryId]) visitedByMap[countryId] = [];
      if (vfm.family_member_id) {
        const member = familyMembers.find((m) => m.id === vfm.family_member_id);
        if (member && !visitedByMap[countryId].includes(member.name)) {
          visitedByMap[countryId].push(member.name);
        }
      } else if (!visitedByMap[countryId].includes("Visited")) {
        visitedByMap[countryId].push("Visited");
      }
    });

    // Transform countries with visitedBy
    const countriesWithVisitedBy = countries.map((c) => ({
      ...c,
      visitedBy: visitedByMap[c.id] || [],
    }));

    // Compute continents
    const visitedContinents = new Set<string>();
    countriesWithVisitedBy.forEach((c) => {
      if (c.visitedBy.length > 0) {
        const code = getCountryCodeFromFlag(c.flag);
        if (code && countryToContinentMap[code]) {
          visitedContinents.add(countryToContinentMap[code]);
        } else if (c.continent) {
          visitedContinents.add(c.continent);
        }
      }
    });

    // Earliest year
    let earliestYear: number | null = null;
    visitDetails.forEach((vd) => {
      const year = vd.visit_date 
        ? new Date(vd.visit_date).getFullYear() 
        : vd.approximate_year;
      if (year && (!earliestYear || year < earliestYear)) {
        earliestYear = year;
      }
    });

    // Per-member country counts
    const memberCountryCounts: Record<string, Set<string>> = {};
    familyMembers.forEach((m) => memberCountryCounts[m.id] = new Set());
    visits.forEach((v) => {
      if (v.family_member_id && v.country_id) {
        memberCountryCounts[v.family_member_id]?.add(v.country_id);
      }
    });
    visitFamilyMembers.forEach((vfm) => {
      const countryId = visitIdToCountryId[vfm.visit_id];
      if (countryId && vfm.family_member_id) {
        memberCountryCounts[vfm.family_member_id]?.add(countryId);
      }
    });

    const familyMembersWithCounts = familyMembers.map((m) => ({
      ...m,
      countriesVisited: memberCountryCounts[m.id]?.size || 0,
    }));

    // Stats
    const uniqueStateCodes = [...new Set(stateVisits.map((sv) => sv.state_code))];
    const visitedCountriesCount = countriesWithVisitedBy.filter((c) => c.visitedBy.length > 0).length;
    const visitedContinentsCount = visitedContinents.size;
    const visitedStatesCount = uniqueStateCodes.length;

    (debug.query_counts as Record<string, number>).visited_countries_computed = visitedCountriesCount;
    (debug.query_counts as Record<string, number>).visited_continents_computed = visitedContinentsCount;

    // === Step 6: Build response ===
    const response = {
      ok: true,
      debug,
      data: {
        shareSettings,
        owner: {
          fullName: ownerProfile.full_name,
          avatarUrl: ownerProfile.avatar_url,
          homeCountry: ownerProfile.home_country,
        },
        countries: countriesWithVisitedBy,
        familyMembers: familyMembersWithCounts,
        visitDetails,
        visitFamilyMembers,
        stateVisits,
        photos,
        stats: {
          visitedCountriesCount,
          visitedContinentsCount,
          visitedStatesCount,
          earliestYear,
        },
      },
    };

    console.log("[get-public-dashboard] SUCCESS - returning data for", ownerProfile.full_name);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[get-public-dashboard] EXCEPTION:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        debug: { exception: true },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
