import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareLink {
  id: string;
  owner_user_id: string;
  token: string;
  is_active: boolean;
  include_stats: boolean;
  include_countries: boolean;
  include_memories: boolean;
  created_at: string;
  last_accessed_at: string | null;
}

interface DebugInfo {
  token_normalized: string;
  token_found: boolean;
  is_active: boolean;
  owner_user_id: string | null;
  owner_found: boolean;
  query_counts: {
    visitedCountries: number;
    visitedStates: number;
    visitedContinents: number;
    wishlistCountries: number;
    memories: number;
    familyMembers: number;
  };
  visited_source_tables: string[];
  reason?: string;
}

interface SharedDashboardResponse {
  ok: boolean;
  error?: string;
  debug: DebugInfo;
  data?: {
    profile: {
      full_name: string | null;
      avatar_url: string | null;
      home_country: string | null;
    };
    visitedCountries: Array<{
      id: string;
      name: string;
      flag: string;
      continent: string;
      iso2: string;
    }>;
    visitedCountryCodes: string[]; // ISO2 codes for map
    visitedContinents: string[];
    wishlistCountries: Array<{
      id: string;
      name: string;
      flag: string;
      continent: string;
      iso2: string;
    }>;
    wishlistCountryCodes: string[]; // ISO2 codes for map
    visitedStates: Array<{
      id: string;
      state_code: string;
      state_name: string;
      country_code: string;
    }>;
    familyMembers: Array<{
      id: string;
      name: string;
      role: string;
      avatar: string;
      color: string;
      countriesVisited: number;
    }>;
    visitDetails: Array<{
      id: string;
      country_id: string;
      visit_date: string | null;
      approximate_year: number | null;
      approximate_month: number | null;
      is_approximate: boolean | null;
      trip_name: string | null;
      highlight: string | null;
    }>;
    memories: Array<{
      id: string;
      photo_url: string;
      caption: string | null;
      country_id: string | null;
      taken_at: string | null;
    }>;
    sinceYear: number | null;
    counts: {
      visitedCountries: number;
      visitedStates: number;
      visitedContinents: number;
      wishlistCountries: number;
      memories: number;
    };
    mapboxToken: string | null;
  };
}

// ISO2 to ISO3 mapping for common countries (Mapbox uses ISO3)
const iso2ToIso3: Record<string, string> = {
  AF: "AFG", AL: "ALB", DZ: "DZA", AD: "AND", AO: "AGO", AG: "ATG", AR: "ARG", AM: "ARM", AU: "AUS", AT: "AUT",
  AZ: "AZE", BS: "BHS", BH: "BHR", BD: "BGD", BB: "BRB", BY: "BLR", BE: "BEL", BZ: "BLZ", BJ: "BEN", BT: "BTN",
  BO: "BOL", BA: "BIH", BW: "BWA", BR: "BRA", BN: "BRN", BG: "BGR", BF: "BFA", BI: "BDI", CV: "CPV", KH: "KHM",
  CM: "CMR", CA: "CAN", CF: "CAF", TD: "TCD", CL: "CHL", CN: "CHN", CO: "COL", KM: "COM", CG: "COG", CD: "COD",
  CR: "CRI", HR: "HRV", CU: "CUB", CY: "CYP", CZ: "CZE", DK: "DNK", DJ: "DJI", DM: "DMA", DO: "DOM", EC: "ECU",
  EG: "EGY", SV: "SLV", GQ: "GNQ", ER: "ERI", EE: "EST", SZ: "SWZ", ET: "ETH", FJ: "FJI", FI: "FIN", FR: "FRA",
  GA: "GAB", GM: "GMB", GE: "GEO", DE: "DEU", GH: "GHA", GR: "GRC", GD: "GRD", GT: "GTM", GN: "GIN", GW: "GNB",
  GY: "GUY", HT: "HTI", HN: "HND", HU: "HUN", IS: "ISL", IN: "IND", ID: "IDN", IR: "IRN", IQ: "IRQ", IE: "IRL",
  IL: "ISR", IT: "ITA", CI: "CIV", JM: "JAM", JP: "JPN", JO: "JOR", KZ: "KAZ", KE: "KEN", KI: "KIR", KP: "PRK",
  KR: "KOR", KW: "KWT", KG: "KGZ", LA: "LAO", LV: "LVA", LB: "LBN", LS: "LSO", LR: "LBR", LY: "LBY", LI: "LIE",
  LT: "LTU", LU: "LUX", MG: "MDG", MW: "MWI", MY: "MYS", MV: "MDV", ML: "MLI", MT: "MLT", MH: "MHL", MR: "MRT",
  MU: "MUS", MX: "MEX", FM: "FSM", MD: "MDA", MC: "MCO", MN: "MNG", ME: "MNE", MA: "MAR", MZ: "MOZ", MM: "MMR",
  NA: "NAM", NR: "NRU", NP: "NPL", NL: "NLD", NZ: "NZL", NI: "NIC", NE: "NER", NG: "NGA", MK: "MKD", NO: "NOR",
  OM: "OMN", PK: "PAK", PW: "PLW", PA: "PAN", PG: "PNG", PY: "PRY", PE: "PER", PH: "PHL", PL: "POL", PT: "PRT",
  QA: "QAT", RO: "ROU", RU: "RUS", RW: "RWA", KN: "KNA", LC: "LCA", VC: "VCT", WS: "WSM", SM: "SMR", ST: "STP",
  SA: "SAU", SN: "SEN", RS: "SRB", SC: "SYC", SL: "SLE", SG: "SGP", SK: "SVK", SI: "SVN", SB: "SLB", SO: "SOM",
  ZA: "ZAF", SS: "SSD", ES: "ESP", LK: "LKA", SD: "SDN", SR: "SUR", SE: "SWE", CH: "CHE", SY: "SYR", TW: "TWN",
  TJ: "TJK", TZ: "TZA", TH: "THA", TL: "TLS", TG: "TGO", TO: "TON", TT: "TTO", TN: "TUN", TR: "TUR", TM: "TKM",
  TV: "TUV", UG: "UGA", UA: "UKR", AE: "ARE", GB: "GBR", US: "USA", UY: "URY", UZ: "UZB", VU: "VUT", VA: "VAT",
  VE: "VEN", VN: "VNM", YE: "YEM", ZM: "ZMB", ZW: "ZWE", PS: "PSE", XK: "XKX", HK: "HKG", MO: "MAC", PR: "PRI"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const debug: DebugInfo = {
    token_normalized: "",
    token_found: false,
    is_active: false,
    owner_user_id: null,
    owner_found: false,
    query_counts: {
      visitedCountries: 0,
      visitedStates: 0,
      visitedContinents: 0,
      wishlistCountries: 0,
      memories: 0,
      familyMembers: 0,
    },
    visited_source_tables: ["country_visits", "visit_family_members", "country_visit_details", "state_visits", "country_wishlist", "travel_photos"],
  };

  try {
    // Parse token from request body or query params
    let token: string | null = null;
    
    if (req.method === "POST") {
      const body = await req.json();
      token = body.token;
    } else {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
    }

    if (!token) {
      debug.reason = "no_token_provided";
      return new Response(
        JSON.stringify({ ok: false, error: "No token provided", debug } as SharedDashboardResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize token
    const tokenNormalized = token.trim().toLowerCase();
    debug.token_normalized = tokenNormalized;

    // Get service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !serviceRoleKey) {
      debug.reason = "server_misconfigured";
      return new Response(
        JSON.stringify({ ok: false, error: "Server misconfigured", debug } as SharedDashboardResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Look up share_links by token
    const { data: shareLinks, error: shareLinkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", tokenNormalized)
      .limit(1);

    if (shareLinkError) {
      console.error("share_links query error:", shareLinkError);
      debug.reason = "share_links_query_error";
      return new Response(
        JSON.stringify({ ok: false, error: "Database error", debug } as SharedDashboardResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!shareLinks || shareLinks.length === 0) {
      debug.reason = "token_not_found";
      return new Response(
        JSON.stringify({ ok: false, error: "Link not found", debug } as SharedDashboardResponse),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shareLink = shareLinks[0] as ShareLink;
    debug.token_found = true;
    debug.is_active = shareLink.is_active;
    debug.owner_user_id = shareLink.owner_user_id;

    if (!shareLink.is_active) {
      debug.reason = "inactive_link";
      return new Response(
        JSON.stringify({ ok: false, error: "Link is disabled", debug } as SharedDashboardResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerId = shareLink.owner_user_id;

    // Update last_accessed_at (fire and forget)
    supabase
      .from("share_links")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", shareLink.id)
      .then(() => {});

    // Step 2: Fetch owner profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, home_country")
      .eq("id", ownerId)
      .single();

    if (profileError || !profileData) {
      debug.reason = "owner_missing";
      return new Response(
        JSON.stringify({ ok: false, error: "Owner profile not found", debug } as SharedDashboardResponse),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debug.owner_found = true;

    // Step 3: Parallel fetch all travel data for owner
    const [
      countriesResult,
      countryVisitsResult,
      visitDetailsResult,
      visitMembersResult,
      stateVisitsResult,
      wishlistResult,
      familyMembersResult,
      photosResult,
    ] = await Promise.all([
      supabase.from("countries").select("*").eq("user_id", ownerId).order("name"),
      supabase.from("country_visits").select("country_id, family_member_id").eq("user_id", ownerId),
      supabase.from("country_visit_details").select("*").eq("user_id", ownerId).order("visit_date", { ascending: false }),
      supabase.from("visit_family_members").select("visit_id, family_member_id").eq("user_id", ownerId),
      supabase.from("state_visits").select("*").eq("user_id", ownerId),
      supabase.from("country_wishlist").select("country_id").eq("user_id", ownerId),
      supabase.from("family_members").select("*").eq("user_id", ownerId).order("created_at"),
      shareLink.include_memories 
        ? supabase.from("travel_photos").select("*").eq("user_id", ownerId).eq("is_shareable", true).order("taken_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Check for errors
    if (countriesResult.error) console.error("countries error:", countriesResult.error);
    if (countryVisitsResult.error) console.error("country_visits error:", countryVisitsResult.error);
    if (visitDetailsResult.error) console.error("visit_details error:", visitDetailsResult.error);
    if (visitMembersResult.error) console.error("visit_members error:", visitMembersResult.error);
    if (stateVisitsResult.error) console.error("state_visits error:", stateVisitsResult.error);
    if (wishlistResult.error) console.error("wishlist error:", wishlistResult.error);
    if (familyMembersResult.error) console.error("family_members error:", familyMembersResult.error);
    if (photosResult.error) console.error("photos error:", photosResult.error);

    const countriesData = countriesResult.data || [];
    const countryVisitsData = countryVisitsResult.data || [];
    const visitDetailsData = visitDetailsResult.data || [];
    const visitMembersData = visitMembersResult.data || [];
    const stateVisitsData = stateVisitsResult.data || [];
    const wishlistData = wishlistResult.data || [];
    const familyMembersData = familyMembersResult.data || [];
    const photosData = photosResult.data || [];

    // Step 4: Build visited country set from BOTH systems
    // Map: country_id -> Set of member_ids who visited
    const visitedCountryIds = new Set<string>();
    const countriesByMember = new Map<string, Set<string>>();

    // Build visit_id -> country_id map from visit_details
    const visitToCountry = new Map<string, string>();
    for (const vd of visitDetailsData) {
      if (vd.id && vd.country_id) {
        visitToCountry.set(vd.id, vd.country_id);
        visitedCountryIds.add(vd.country_id);
      }
    }

    // Process visit_family_members (new system)
    for (const vm of visitMembersData) {
      const countryId = visitToCountry.get(vm.visit_id);
      if (countryId) {
        visitedCountryIds.add(countryId);
        if (vm.family_member_id) {
          if (!countriesByMember.has(vm.family_member_id)) {
            countriesByMember.set(vm.family_member_id, new Set());
          }
          countriesByMember.get(vm.family_member_id)!.add(countryId);
        }
      }
    }

    // Process country_visits (old system)
    for (const cv of countryVisitsData) {
      if (cv.country_id) {
        visitedCountryIds.add(cv.country_id);
        if (cv.family_member_id) {
          if (!countriesByMember.has(cv.family_member_id)) {
            countriesByMember.set(cv.family_member_id, new Set());
          }
          countriesByMember.get(cv.family_member_id)!.add(cv.country_id);
        }
      }
    }

    // Step 5: Build visited countries with ISO2 codes
    interface VisitedCountry {
      id: string;
      name: string;
      flag: string;
      continent: string;
      iso2: string;
    }
    const visitedCountries: VisitedCountry[] = [];
    const visitedContinentsSet = new Set<string>();
    
    // Create a name-to-ISO2 mapping from countries-list library patterns
    // The stored countries have a "name" field that matches country names
    const nameToIso2: Record<string, string> = {
      "United States": "US", "United Kingdom": "GB", "United Arab Emirates": "AE",
      "Czech Republic": "CZ", "Czechia": "CZ", "South Korea": "KR", "North Korea": "KP",
      // Add common mappings - the edge function will infer most from flag emoji
    };

    for (const country of countriesData) {
      if (visitedCountryIds.has(country.id)) {
        // Try to extract ISO2 from flag emoji (most reliable)
        let iso2 = "";
        if (country.flag && country.flag.length >= 2) {
          // Flag emoji uses regional indicator symbols: 🇺🇸 = U+1F1FA U+1F1F8
          const codePoints = [...country.flag];
          if (codePoints.length === 2) {
            const first = codePoints[0].codePointAt(0);
            const second = codePoints[1].codePointAt(0);
            if (first && second && first >= 0x1F1E6 && first <= 0x1F1FF && second >= 0x1F1E6 && second <= 0x1F1FF) {
              const char1 = String.fromCharCode(first - 0x1F1E6 + 65);
              const char2 = String.fromCharCode(second - 0x1F1E6 + 65);
              iso2 = char1 + char2;
            }
          }
        }
        
        // Fallback to name mapping
        if (!iso2) {
          iso2 = nameToIso2[country.name] || "";
        }

        visitedCountries.push({
          id: country.id,
          name: country.name,
          flag: country.flag,
          continent: country.continent,
          iso2: iso2.toUpperCase(),
        });
        visitedContinentsSet.add(country.continent);
      }
    }

    // Step 6: Build wishlist countries
    const wishlistCountryIds = new Set(wishlistData.map(w => w.country_id).filter(Boolean));
    const wishlistCountries: VisitedCountry[] = [];
    
    for (const country of countriesData) {
      if (wishlistCountryIds.has(country.id)) {
        let iso2 = "";
        if (country.flag && country.flag.length >= 2) {
          const codePoints = [...country.flag];
          if (codePoints.length === 2) {
            const first = codePoints[0].codePointAt(0);
            const second = codePoints[1].codePointAt(0);
            if (first && second && first >= 0x1F1E6 && first <= 0x1F1FF && second >= 0x1F1E6 && second <= 0x1F1FF) {
              const char1 = String.fromCharCode(first - 0x1F1E6 + 65);
              const char2 = String.fromCharCode(second - 0x1F1E6 + 65);
              iso2 = char1 + char2;
            }
          }
        }
        
        wishlistCountries.push({
          id: country.id,
          name: country.name,
          flag: country.flag,
          continent: country.continent,
          iso2: iso2.toUpperCase(),
        });
      }
    }

    // Step 7: Build family members with country counts
    const familyMembers = familyMembersData.map(fm => ({
      id: fm.id,
      name: fm.name,
      role: fm.role,
      avatar: fm.avatar,
      color: fm.color,
      countriesVisited: countriesByMember.get(fm.id)?.size || 0,
    }));

    // Step 8: Calculate "since" (earliest year)
    let sinceYear: number | null = null;
    for (const vd of visitDetailsData) {
      let year: number | null = null;
      if (vd.visit_date) {
        const d = new Date(vd.visit_date);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
        }
      } else if (vd.approximate_year) {
        year = vd.approximate_year;
      }
      if (year && (!sinceYear || year < sinceYear)) {
        sinceYear = year;
      }
    }

    // Step 9: Build ISO2 and ISO3 code arrays for map
    const visitedIso2Codes: string[] = visitedCountries.map((c: VisitedCountry) => c.iso2).filter((x): x is string => Boolean(x));
    const wishlistIso2Codes: string[] = wishlistCountries.map((c: VisitedCountry) => c.iso2).filter((x): x is string => Boolean(x));
    
    // Convert to ISO3 for Mapbox (it uses ISO3)
    const visitedCountryCodes: string[] = [...new Set(visitedIso2Codes.map((iso2: string) => iso2ToIso3[iso2] || iso2))];
    const wishlistCountryCodes: string[] = [...new Set(wishlistIso2Codes.map((iso2: string) => iso2ToIso3[iso2] || iso2))];

    // Step 10: Update debug counts
    debug.query_counts = {
      visitedCountries: visitedCountries.length,
      visitedStates: stateVisitsData.length,
      visitedContinents: visitedContinentsSet.size,
      wishlistCountries: wishlistCountries.length,
      memories: photosData.length,
      familyMembers: familyMembersData.length,
    };

    // Validate map codes match counts
    if (visitedCountries.length > 0 && visitedCountryCodes.length === 0) {
      debug.reason = "map_codes_mismatch";
      console.error("Visited countries exist but no ISO codes extracted");
    }

    // Get Mapbox token
    const mapboxToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN") || null;

    // Build response
    const response: SharedDashboardResponse = {
      ok: true,
      debug,
      data: {
        profile: {
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          home_country: profileData.home_country,
        },
        visitedCountries,
        visitedCountryCodes,
        visitedContinents: [...visitedContinentsSet],
        wishlistCountries,
        wishlistCountryCodes,
        visitedStates: stateVisitsData.map(sv => ({
          id: sv.id,
          state_code: sv.state_code,
          state_name: sv.state_name,
          country_code: sv.country_code,
        })),
        familyMembers,
        visitDetails: visitDetailsData.map(vd => ({
          id: vd.id,
          country_id: vd.country_id,
          visit_date: vd.visit_date,
          approximate_year: vd.approximate_year,
          approximate_month: vd.approximate_month,
          is_approximate: vd.is_approximate,
          trip_name: vd.trip_name,
          highlight: vd.highlight,
        })),
        memories: photosData.map(p => ({
          id: p.id,
          photo_url: p.photo_url,
          caption: p.caption,
          country_id: p.country_id,
          taken_at: p.taken_at,
        })),
        sinceYear,
        counts: {
          visitedCountries: visitedCountries.length,
          visitedStates: new Set(stateVisitsData.map(s => s.state_code)).size,
          visitedContinents: visitedContinentsSet.size,
          wishlistCountries: wishlistCountries.length,
          memories: photosData.length,
        },
        mapboxToken,
      },
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("get-shared-dashboard error:", message);
    debug.reason = `exception: ${message}`;
    return new Response(
      JSON.stringify({ ok: false, error: message, debug } as SharedDashboardResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
