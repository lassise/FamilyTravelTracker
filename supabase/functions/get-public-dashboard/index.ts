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

// Extract country code from country name or flag emoji
function getCountryCodeFromFlag(flag: string): string | null {
  if (!flag || flag.length < 2) return null;
  // Flag emojis are made of regional indicator symbols
  const codePoints = [...flag].map((char) => char.codePointAt(0) || 0);
  if (codePoints.length >= 2 && codePoints[0] >= 0x1f1e6 && codePoints[0] <= 0x1f1ff) {
    const first = String.fromCharCode(codePoints[0] - 0x1f1e6 + 65);
    const second = String.fromCharCode(codePoints[1] - 0x1f1e6 + 65);
    return first + second;
  }
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    // Normalize token
    const tokenNormalized = token?.trim().toLowerCase();
    if (!tokenNormalized || tokenNormalized.length !== 32 || !/^[a-f0-9]+$/.test(tokenNormalized)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid or missing token",
          debug: { token_provided: !!token, token_format_valid: false },
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
      owner_found: false,
      query_steps: [] as string[],
      query_counts: {} as Record<string, number>,
      failures: [] as string[],
    };

    let ownerId: string | null = null;
    let shareProfile: any = null;
    let shareSettings: any = null;

    // Step 1: Try new share_links table first
    (debug.query_steps as string[]).push("lookup_share_links");
    const { data: shareLink, error: shareLinkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", tokenNormalized)
      .eq("is_active", true)
      .maybeSingle();

    if (!shareLinkError && shareLink) {
      // Found in new share_links table
      debug.token_found = true;
      debug.token_source = "share_links.token";
      debug.owner_user_id = shareLink.owner_user_id;
      ownerId = shareLink.owner_user_id;

      // Convert share_links format to shareSettings format
      shareSettings = {
        show_stats: shareLink.include_stats,
        show_map: true, // Default to true for new system
        show_countries: shareLink.include_countries,
        show_photos: shareLink.include_memories, // include_memories includes photos
        show_timeline: shareLink.include_memories, // include_memories includes timeline
        show_family_members: true, // Default to true
        show_achievements: true, // Default to true
        show_wishlist: false, // Not in new system yet
      };
    } else {
      // Step 2: Fall back to old share_profiles table
      (debug.query_steps as string[]).push("lookup_share_profile");
      const { data: oldShareProfile, error: shareError } = await supabase
        .from("share_profiles")
        .select("*")
        .eq("dashboard_share_token", tokenNormalized)
        .eq("is_public", true)
        .maybeSingle();

      if (shareError || !oldShareProfile) {
        (debug.failures as string[]).push("share_link and share_profile not found");
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
      debug.owner_user_id = oldShareProfile.user_id;
      ownerId = oldShareProfile.user_id;
      shareProfile = oldShareProfile;
      shareSettings = {
        show_stats: oldShareProfile.show_stats,
        show_map: oldShareProfile.show_map,
        show_countries: oldShareProfile.show_countries,
        show_photos: oldShareProfile.show_photos,
        show_timeline: oldShareProfile.show_timeline,
        show_family_members: oldShareProfile.show_family_members,
        show_achievements: oldShareProfile.show_achievements,
        show_wishlist: oldShareProfile.show_wishlist,
      };
    }

    if (!ownerId) {
      (debug.failures as string[]).push("owner_id not found");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Owner not found",
          debug,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get owner profile
    (debug.query_steps as string[]).push("fetch_owner_profile");
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, home_country")
      .eq("id", ownerId)
      .single();

    if (!ownerProfile) {
      (debug.failures as string[]).push("owner profile not found");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Owner profile not found",
          debug,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    debug.owner_found = true;

    // Step 3: Fetch countries (the user's country list)
    (debug.query_steps as string[]).push("fetch_countries");
    const { data: countriesData } = await supabase
      .from("countries")
      .select("id, name, flag, continent")
      .eq("user_id", ownerId);

    const countries = countriesData || [];
    (debug.query_counts as Record<string, number>).countries = countries.length;

    // Step 4: Fetch country visits
    (debug.query_steps as string[]).push("fetch_country_visits");
    const { data: visitsData } = await supabase
      .from("country_visits")
      .select("country_id, family_member_id")
      .eq("user_id", ownerId);

    const visits = visitsData || [];
    (debug.query_counts as Record<string, number>).country_visits = visits.length;

    // Step 5: Fetch visit details
    (debug.query_steps as string[]).push("fetch_visit_details");
    const { data: visitDetailsData } = await supabase
      .from("country_visit_details")
      .select("id, country_id, visit_date, end_date, number_of_days, notes, approximate_year, approximate_month, is_approximate, trip_name, highlight, why_it_mattered")
      .eq("user_id", ownerId)
      .order("visit_date", { ascending: false, nullsFirst: false });

    const visitDetails = visitDetailsData || [];
    (debug.query_counts as Record<string, number>).visit_details = visitDetails.length;

    // Step 6: Fetch visit-family member mappings
    (debug.query_steps as string[]).push("fetch_visit_family_members");
    const { data: visitFamilyMembersData } = await supabase
      .from("visit_family_members")
      .select("visit_id, family_member_id")
      .eq("user_id", ownerId);

    const visitFamilyMembers = visitFamilyMembersData || [];
    (debug.query_counts as Record<string, number>).visit_family_members = visitFamilyMembers.length;

    // Step 7: Fetch family members (only if allowed)
    let familyMembers: Array<{id: string; name: string; role: string; avatar: string; color: string}> = [];
    if (shareSettings.show_family_members) {
      (debug.query_steps as string[]).push("fetch_family_members");
      const { data: familyData } = await supabase
        .from("family_members")
        .select("id, name, role, avatar, color")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: true });

      familyMembers = familyData || [];
      (debug.query_counts as Record<string, number>).family_members = familyMembers.length;
    }

    // Step 8: Fetch state visits
    (debug.query_steps as string[]).push("fetch_state_visits");
    const { data: stateVisitsData } = await supabase
      .from("state_visits")
      .select("id, state_code, state_name, country_code, country_id, family_member_id, created_at")
      .eq("user_id", ownerId);

    const stateVisits = stateVisitsData || [];
    (debug.query_counts as Record<string, number>).state_visits = stateVisits.length;

    // Step 9: Fetch photos (only if allowed)
    let photos: Array<{id: string; photo_url: string; caption: string | null; country_id: string | null; taken_at: string | null}> = [];
    if (shareSettings.show_photos) {
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

    // Step 10: Compute visited country IDs (deduped)
    const visitedCountryIds = new Set<string>();
    visits.forEach((v) => {
      if (v.country_id) visitedCountryIds.add(v.country_id);
    });
    visitDetails.forEach((vd) => {
      if (vd.country_id) visitedCountryIds.add(vd.country_id);
    });

    // Build visited-by mapping
    const visitedByMap: Record<string, string[]> = {};
    const countryIdToCode: Record<string, string> = {};

    countries.forEach((c) => {
      const code = getCountryCodeFromFlag(c.flag);
      if (code) countryIdToCode[c.id] = code;
    });

    // From country_visits
    visits.forEach((v) => {
      if (!v.country_id) return;
      if (!visitedByMap[v.country_id]) visitedByMap[v.country_id] = [];
      if (shareSettings.show_family_members && v.family_member_id) {
        const member = familyMembers.find((m) => m.id === v.family_member_id);
        if (member && !visitedByMap[v.country_id].includes(member.name)) {
          visitedByMap[v.country_id].push(member.name);
        }
      } else if (!visitedByMap[v.country_id].includes("Visited")) {
        visitedByMap[v.country_id].push("Visited");
      }
    });

    // From visit_family_members (for detailed visits)
    const visitIdToCountryId: Record<string, string> = {};
    visitDetails.forEach((vd) => {
      if (vd.id && vd.country_id) visitIdToCountryId[vd.id] = vd.country_id;
    });

    visitFamilyMembers.forEach((vfm) => {
      const countryId = visitIdToCountryId[vfm.visit_id];
      if (!countryId) return;
      if (!visitedByMap[countryId]) visitedByMap[countryId] = [];
      if (shareSettings.show_family_members && vfm.family_member_id) {
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

    // Compute continents from visited countries
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

    // Compute earliest year
    let earliestYear: number | null = null;
    visitDetails.forEach((vd) => {
      const year = vd.visit_date 
        ? new Date(vd.visit_date).getFullYear() 
        : vd.approximate_year;
      if (year && (!earliestYear || year < earliestYear)) {
        earliestYear = year;
      }
    });

    // Compute per-member country counts
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

    // Build unique visited state codes
    const uniqueStateCodes = [...new Set(stateVisits.map((sv) => sv.state_code))];

    // Build stats
    const visitedCountriesCount = countriesWithVisitedBy.filter((c) => c.visitedBy.length > 0).length;
    const visitedContinentsCount = visitedContinents.size;
    const visitedStatesCount = uniqueStateCodes.length;

    (debug.query_counts as Record<string, number>).visited_countries_computed = visitedCountriesCount;
    (debug.query_counts as Record<string, number>).visited_continents_computed = visitedContinentsCount;
    (debug.query_counts as Record<string, number>).visited_states_computed = visitedStatesCount;

    // Build response
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

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-public-dashboard error:", error);
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
