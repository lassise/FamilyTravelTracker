/**
 * get-shared-dashboard Edge Function
 * 
 * SOURCE OF TRUTH for shared dashboard data.
 * 
 * This function uses SERVICE_ROLE_KEY to bypass RLS and return the OWNER's data
 * for anonymous viewers. The shared page MUST call ONLY this function.
 * 
 * Tables used (same as logged-in dashboard):
 * - share_profiles: token lookup + visibility settings (dashboard_share_token)
 * - profiles: owner display name, home_country
 * - countries: user's country list (user_id)
 * - country_visits: OLD visit system associations (user_id)
 * - country_visit_details: NEW visit system with dates (user_id)
 * - visit_family_members: member-to-visit mappings (user_id)
 * - state_visits: state/region level visits (user_id)
 * - family_members: family member names/colors (user_id)
 * - country_wishlist: wishlist country ids (user_id)
 * - travel_photos: shareable photos (user_id + is_shareable)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ISO2 to ISO3 mapping for Mapbox
const iso2ToIso3: Record<string, string> = {
  'AF': 'AFG', 'AL': 'ALB', 'DZ': 'DZA', 'AS': 'ASM', 'AD': 'AND',
  'AO': 'AGO', 'AI': 'AIA', 'AQ': 'ATA', 'AG': 'ATG', 'AR': 'ARG',
  'AM': 'ARM', 'AW': 'ABW', 'AU': 'AUS', 'AT': 'AUT', 'AZ': 'AZE',
  'BS': 'BHS', 'BH': 'BHR', 'BD': 'BGD', 'BB': 'BRB', 'BY': 'BLR',
  'BE': 'BEL', 'BZ': 'BLZ', 'BJ': 'BEN', 'BM': 'BMU', 'BT': 'BTN',
  'BO': 'BOL', 'BA': 'BIH', 'BW': 'BWA', 'BR': 'BRA', 'VG': 'VGB',
  'BN': 'BRN', 'BG': 'BGR', 'BF': 'BFA', 'BI': 'BDI', 'CV': 'CPV',
  'KH': 'KHM', 'CM': 'CMR', 'CA': 'CAN', 'KY': 'CYM', 'CF': 'CAF',
  'TD': 'TCD', 'CL': 'CHL', 'CN': 'CHN', 'CO': 'COL', 'KM': 'COM',
  'CG': 'COG', 'CD': 'COD', 'CR': 'CRI', 'CI': 'CIV', 'HR': 'HRV',
  'CU': 'CUB', 'CY': 'CYP', 'CZ': 'CZE', 'DK': 'DNK', 'DJ': 'DJI',
  'DM': 'DMA', 'DO': 'DOM', 'EC': 'ECU', 'EG': 'EGY', 'SV': 'SLV',
  'GQ': 'GNQ', 'ER': 'ERI', 'EE': 'EST', 'SZ': 'SWZ', 'ET': 'ETH',
  'FJ': 'FJI', 'FI': 'FIN', 'FR': 'FRA', 'GF': 'GUF', 'PF': 'PYF',
  'GA': 'GAB', 'GM': 'GMB', 'GE': 'GEO', 'DE': 'DEU', 'GH': 'GHA',
  'GI': 'GIB', 'GR': 'GRC', 'GL': 'GRL', 'GD': 'GRD', 'GP': 'GLP',
  'GU': 'GUM', 'GT': 'GTM', 'GG': 'GGY', 'GN': 'GIN', 'GW': 'GNB',
  'GY': 'GUY', 'HT': 'HTI', 'HN': 'HND', 'HK': 'HKG', 'HU': 'HUN',
  'IS': 'ISL', 'IN': 'IND', 'ID': 'IDN', 'IR': 'IRN', 'IQ': 'IRQ',
  'IE': 'IRL', 'IM': 'IMN', 'IL': 'ISR', 'IT': 'ITA', 'JM': 'JAM',
  'JP': 'JPN', 'JE': 'JEY', 'JO': 'JOR', 'KZ': 'KAZ', 'KE': 'KEN',
  'KI': 'KIR', 'KP': 'PRK', 'KR': 'KOR', 'KW': 'KWT', 'KG': 'KGZ',
  'LA': 'LAO', 'LV': 'LVA', 'LB': 'LBN', 'LS': 'LSO', 'LR': 'LBR',
  'LY': 'LBY', 'LI': 'LIE', 'LT': 'LTU', 'LU': 'LUX', 'MO': 'MAC',
  'MG': 'MDG', 'MW': 'MWI', 'MY': 'MYS', 'MV': 'MDV', 'ML': 'MLI',
  'MT': 'MLT', 'MH': 'MHL', 'MQ': 'MTQ', 'MR': 'MRT', 'MU': 'MUS',
  'YT': 'MYT', 'MX': 'MEX', 'FM': 'FSM', 'MD': 'MDA', 'MC': 'MCO',
  'MN': 'MNG', 'ME': 'MNE', 'MS': 'MSR', 'MA': 'MAR', 'MZ': 'MOZ',
  'MM': 'MMR', 'NA': 'NAM', 'NR': 'NRU', 'NP': 'NPL', 'NL': 'NLD',
  'NC': 'NCL', 'NZ': 'NZL', 'NI': 'NIC', 'NE': 'NER', 'NG': 'NGA',
  'NU': 'NIU', 'NF': 'NFK', 'MK': 'MKD', 'MP': 'MNP', 'NO': 'NOR',
  'OM': 'OMN', 'PK': 'PAK', 'PW': 'PLW', 'PS': 'PSE', 'PA': 'PAN',
  'PG': 'PNG', 'PY': 'PRY', 'PE': 'PER', 'PH': 'PHL', 'PN': 'PCN',
  'PL': 'POL', 'PT': 'PRT', 'PR': 'PRI', 'QA': 'QAT', 'RE': 'REU',
  'RO': 'ROU', 'RU': 'RUS', 'RW': 'RWA', 'BL': 'BLM', 'SH': 'SHN',
  'KN': 'KNA', 'LC': 'LCA', 'MF': 'MAF', 'PM': 'SPM', 'VC': 'VCT',
  'WS': 'WSM', 'SM': 'SMR', 'ST': 'STP', 'SA': 'SAU', 'SN': 'SEN',
  'RS': 'SRB', 'SC': 'SYC', 'SL': 'SLE', 'SG': 'SGP', 'SX': 'SXM',
  'SK': 'SVK', 'SI': 'SVN', 'SB': 'SLB', 'SO': 'SOM', 'ZA': 'ZAF',
  'SS': 'SSD', 'ES': 'ESP', 'LK': 'LKA', 'SD': 'SDN', 'SR': 'SUR',
  'SE': 'SWE', 'CH': 'CHE', 'SY': 'SYR', 'TW': 'TWN', 'TJ': 'TJK',
  'TZ': 'TZA', 'TH': 'THA', 'TL': 'TLS', 'TG': 'TGO', 'TK': 'TKL',
  'TO': 'TON', 'TT': 'TTO', 'TN': 'TUN', 'TR': 'TUR', 'TM': 'TKM',
  'TC': 'TCA', 'TV': 'TUV', 'UG': 'UGA', 'UA': 'UKR', 'AE': 'ARE',
  'GB': 'GBR', 'US': 'USA', 'UY': 'URY', 'UZ': 'UZB', 'VU': 'VUT',
  'VE': 'VEN', 'VN': 'VNM', 'VI': 'VIR', 'WF': 'WLF', 'EH': 'ESH',
  'YE': 'YEM', 'ZM': 'ZMB', 'ZW': 'ZWE', 'XK': 'XKX',
};

// Country name to ISO3 fallback mapping
const nameToIso3: Record<string, string> = {
  'Afghanistan': 'AFG', 'Albania': 'ALB', 'Algeria': 'DZA', 'Argentina': 'ARG',
  'Australia': 'AUS', 'Austria': 'AUT', 'Bangladesh': 'BGD', 'Belgium': 'BEL',
  'Brazil': 'BRA', 'Canada': 'CAN', 'Chile': 'CHL', 'China': 'CHN',
  'Colombia': 'COL', 'Croatia': 'HRV', 'Czech Republic': 'CZE', 'Denmark': 'DNK',
  'Egypt': 'EGY', 'Finland': 'FIN', 'France': 'FRA', 'Germany': 'DEU',
  'Greece': 'GRC', 'Hungary': 'HUN', 'Iceland': 'ISL', 'India': 'IND',
  'Indonesia': 'IDN', 'Iran': 'IRN', 'Iraq': 'IRQ', 'Ireland': 'IRL',
  'Israel': 'ISR', 'Italy': 'ITA', 'Japan': 'JPN', 'Jordan': 'JOR',
  'Kenya': 'KEN', 'Malaysia': 'MYS', 'Mexico': 'MEX', 'Morocco': 'MAR',
  'Nepal': 'NPL', 'Netherlands': 'NLD', 'New Zealand': 'NZL', 'Nigeria': 'NGA',
  'Norway': 'NOR', 'Pakistan': 'PAK', 'Peru': 'PER', 'Philippines': 'PHL',
  'Poland': 'POL', 'Portugal': 'PRT', 'Romania': 'ROU', 'Russia': 'RUS',
  'Saudi Arabia': 'SAU', 'Singapore': 'SGP', 'South Africa': 'ZAF',
  'South Korea': 'KOR', 'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'CHE',
  'Thailand': 'THA', 'Turkey': 'TUR', 'Ukraine': 'UKR', 'United Arab Emirates': 'ARE',
  'United Kingdom': 'GBR', 'United States': 'USA', 'Vietnam': 'VNM',
  'Ecuador': 'ECU', 'Venezuela': 'VEN', 'Cuba': 'CUB', 'Panama': 'PAN',
  'Costa Rica': 'CRI', 'Guatemala': 'GTM', 'Honduras': 'HND', 'Nicaragua': 'NIC',
  'El Salvador': 'SLV', 'Belize': 'BLZ', 'Jamaica': 'JAM', 'Haiti': 'HTI',
  'Dominican Republic': 'DOM', 'Puerto Rico': 'PRI', 'Trinidad and Tobago': 'TTO',
  'Bahamas': 'BHS', 'Barbados': 'BRB', 'Bolivia': 'BOL', 'Paraguay': 'PRY',
  'Uruguay': 'URY', 'Guyana': 'GUY', 'Suriname': 'SUR', 'Antarctica': 'ATA',
  'Luxembourg': 'LUX', 'Malta': 'MLT', 'Cyprus': 'CYP', 'Slovenia': 'SVN',
  'Slovakia': 'SVK', 'Estonia': 'EST', 'Latvia': 'LVA', 'Lithuania': 'LTU',
  'Bulgaria': 'BGR', 'Serbia': 'SRB', 'Montenegro': 'MNE', 'North Macedonia': 'MKD',
  'Bosnia and Herzegovina': 'BIH', 'Kosovo': 'XKX', 'Moldova': 'MDA', 'Belarus': 'BLR',
  'Georgia': 'GEO', 'Armenia': 'ARM', 'Azerbaijan': 'AZE', 'Kazakhstan': 'KAZ',
  'Uzbekistan': 'UZB', 'Turkmenistan': 'TKM', 'Kyrgyzstan': 'KGZ', 'Tajikistan': 'TJK',
  'Mongolia': 'MNG', 'Taiwan': 'TWN', 'Hong Kong': 'HKG', 'Macau': 'MAC',
  'Sri Lanka': 'LKA', 'Myanmar': 'MMR', 'Cambodia': 'KHM', 'Laos': 'LAO',
  'Brunei': 'BRN', 'Papua New Guinea': 'PNG', 'Fiji': 'FJI',
  'Tunisia': 'TUN', 'Libya': 'LBY', 'Sudan': 'SDN', 'South Sudan': 'SSD',
  'Ethiopia': 'ETH', 'Tanzania': 'TZA', 'Uganda': 'UGA', 'Rwanda': 'RWA',
  'Ghana': 'GHA', 'Senegal': 'SEN', 'Ivory Coast': 'CIV', 'Cameroon': 'CMR',
  'Angola': 'AGO', 'Mozambique': 'MOZ', 'Zimbabwe': 'ZWE', 'Zambia': 'ZMB',
  'Botswana': 'BWA', 'Namibia': 'NAM', 'Madagascar': 'MDG', 'Mauritius': 'MUS',
  'Seychelles': 'SYC', 'Lebanon': 'LBN', 'Syria': 'SYR', 'Yemen': 'YEM',
  'Oman': 'OMN', 'Kuwait': 'KWT', 'Bahrain': 'BHR', 'Qatar': 'QAT',
};

// Convert a country record to ISO3 code
function countryToIso3(country: { name: string; flag?: string }): string | null {
  // First try flag field (stores ISO2)
  const iso2 = country.flag?.toUpperCase();
  if (iso2 && iso2ToIso3[iso2]) {
    return iso2ToIso3[iso2];
  }
  // Fallback to name
  return nameToIso3[country.name] || null;
}

interface ResponsePayload {
  ok: boolean;
  error?: string;
  debug: {
    token_normalized: string;
    token_found: boolean;
    is_active?: boolean;
    owner_user_id?: string;
    owner_found?: boolean;
    visited_source_tables?: string[];
    visited_query_counts?: {
      visitedCountries: number;
      visitedStates: number;
      visitedContinents: number;
      wishlistCountries: number;
      memories: number;
    };
    map_codes_match?: boolean;
    errors?: string[];
  };
  data?: {
    owner: { displayName: string; avatarUrl?: string; homeCountry?: string };
    shareSettings: {
      show_stats: boolean;
      show_map: boolean;
      show_countries: boolean;
      show_photos: boolean;
      show_timeline: boolean;
      show_family_members: boolean;
      show_achievements: boolean;
      show_wishlist: boolean;
    };
    visited: {
      countries: Array<{ id: string; name: string; flag: string; continent: string }>;
      states: Array<{ state_code: string; state_name: string; country_code: string }>;
      continents: string[];
    };
    wishlist: {
      countries: Array<{ id: string; name: string; flag: string; continent: string }>;
    };
    since: { year?: number; date?: string; label?: string };
    memories: Array<{
      id: string;
      country_id: string;
      country_name?: string;
      trip_name?: string;
      highlight?: string;
      visit_date?: string;
      approximate_year?: number;
      photos?: Array<{ id: string; url: string; caption?: string }>;
    }>;
    map: {
      homeCountryISO3?: string;
      visitedCountryCodes: string[];
      wishlistCountryCodes: string[];
    };
    stats: {
      visitedCountriesCount: number;
      visitedStatesCount: number;
      visitedContinentsCount: number;
      wishlistCountriesCount: number;
    };
    familyMembers?: Array<{
      id: string;
      name: string;
      role: string;
      avatar: string;
      color: string;
      countriesVisited: number;
    }>;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server configuration error",
        debug: { token_normalized: "", token_found: false, errors: ["Missing SUPABASE_URL or SERVICE_ROLE_KEY"] },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Use service role to bypass RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Parse token from request body or query params
    let token = "";
    const url = new URL(req.url);
    
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body.token || "";
    } else {
      token = url.searchParams.get("token") || "";
    }

    // Normalize token: trim, lowercase
    const token_normalized = (token || "").trim().toLowerCase();

    console.log(`[get-shared-dashboard] Token lookup: "${token_normalized}"`);

    // Validate token format
    if (!token_normalized || token_normalized.length !== 32 || !/^[a-f0-9]+$/.test(token_normalized)) {
      console.log(`[get-shared-dashboard] Invalid token format`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid share link format",
          debug: { token_normalized, token_found: false, errors: ["Token must be 32 hex characters"] },
        } as ResponsePayload),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Look up share_profiles by dashboard_share_token
    const { data: shareRow, error: shareError } = await supabase
      .from("share_profiles")
      .select("*")
      .eq("dashboard_share_token", token_normalized)
      .single();

    if (shareError || !shareRow) {
      console.log(`[get-shared-dashboard] Token not found: ${shareError?.message}`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Dashboard not found or is private",
          debug: {
            token_normalized,
            token_found: false,
            errors: [shareError?.message || "No share_profiles row found for this token"],
          },
        } as ResponsePayload),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check is_active/is_public
    if (!shareRow.is_public) {
      console.log(`[get-shared-dashboard] Share profile is not public`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Dashboard is private",
          debug: {
            token_normalized,
            token_found: true,
            is_active: shareRow.is_public,
            owner_user_id: shareRow.user_id,
            errors: ["Share profile has is_public=false"],
          },
        } as ResponsePayload),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const owner_user_id = shareRow.user_id;
    console.log(`[get-shared-dashboard] Owner: ${owner_user_id}`);

    // Step 2: Fetch owner profile
    const { data: ownerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, home_country")
      .eq("id", owner_user_id)
      .single();

    if (profileError || !ownerProfile) {
      console.log(`[get-shared-dashboard] Owner profile not found`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Owner profile not found",
          debug: {
            token_normalized,
            token_found: true,
            is_active: true,
            owner_user_id,
            owner_found: false,
            errors: [profileError?.message || "No profiles row for owner"],
          },
        } as ResponsePayload),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-shared-dashboard] Owner found: ${ownerProfile.full_name}`);

    // Step 3: Fetch ALL source data in parallel (using SERVICE ROLE - bypasses RLS)
    const [
      countriesRes,
      countryVisitsRes,
      visitDetailsRes,
      visitMembersRes,
      stateVisitsRes,
      familyMembersRes,
      wishlistRes,
      photosRes,
    ] = await Promise.all([
      supabase.from("countries").select("*").eq("user_id", owner_user_id).order("name"),
      supabase.from("country_visits").select("*").eq("user_id", owner_user_id),
      supabase.from("country_visit_details").select("*").eq("user_id", owner_user_id).order("visit_date", { ascending: false }),
      supabase.from("visit_family_members").select("*").eq("user_id", owner_user_id),
      supabase.from("state_visits").select("*").eq("user_id", owner_user_id),
      supabase.from("family_members").select("*").eq("user_id", owner_user_id).order("created_at"),
      supabase.from("country_wishlist").select("*").eq("user_id", owner_user_id),
      supabase.from("travel_photos").select("*").eq("user_id", owner_user_id).eq("is_shareable", true).order("taken_at", { ascending: false }),
    ]);

    const countries = countriesRes.data || [];
    const countryVisits = countryVisitsRes.data || [];
    const visitDetails = visitDetailsRes.data || [];
    const visitMembers = visitMembersRes.data || [];
    const stateVisits = stateVisitsRes.data || [];
    const familyMembers = familyMembersRes.data || [];
    const wishlistData = wishlistRes.data || [];
    const photos = photosRes.data || [];

    console.log(`[get-shared-dashboard] Data fetched: countries=${countries.length}, visits=${countryVisits.length}, details=${visitDetails.length}, states=${stateVisits.length}, members=${familyMembers.length}`);

    // Step 4: Compute visited country IDs (merge OLD + NEW systems, same as useFamilyData)
    const visitedCountryIds = new Set<string>();

    // From country_visits (old system)
    for (const cv of countryVisits) {
      if (cv.country_id) visitedCountryIds.add(cv.country_id);
    }

    // From visit_family_members -> country_visit_details (new system)
    const visitIdToCountryId = new Map<string, string>();
    for (const vd of visitDetails) {
      if (vd.id && vd.country_id) {
        visitIdToCountryId.set(vd.id, vd.country_id);
      }
    }
    for (const vm of visitMembers) {
      const countryId = visitIdToCountryId.get(vm.visit_id);
      if (countryId) visitedCountryIds.add(countryId);
    }

    // Build visited countries array and ISO3 codes
    const visitedCountriesList = countries.filter((c) => visitedCountryIds.has(c.id));
    const visitedCountryCodes: string[] = [];
    for (const c of visitedCountriesList) {
      const iso3 = countryToIso3(c);
      if (iso3) visitedCountryCodes.push(iso3);
    }

    // Compute visited continents
    const visitedContinents = [...new Set(visitedCountriesList.map((c) => c.continent))];

    // Build wishlist countries and ISO3 codes
    const wishlistCountryIds = new Set(wishlistData.map((w) => w.country_id).filter(Boolean));
    const wishlistCountriesList = countries.filter((c) => wishlistCountryIds.has(c.id));
    const wishlistCountryCodes: string[] = [];
    for (const c of wishlistCountriesList) {
      const iso3 = countryToIso3(c);
      if (iso3) wishlistCountryCodes.push(iso3);
    }

    // Compute unique state visits
    const uniqueStateVisits = new Map<string, { state_code: string; state_name: string; country_code: string }>();
    for (const sv of stateVisits) {
      const key = `${sv.country_code}-${sv.state_code}`;
      if (!uniqueStateVisits.has(key)) {
        uniqueStateVisits.set(key, {
          state_code: sv.state_code,
          state_name: sv.state_name,
          country_code: sv.country_code,
        });
      }
    }

    // Compute "since" (earliest year from visit_details)
    let earliestYear: number | undefined;
    let earliestDate: string | undefined;
    for (const vd of visitDetails) {
      if (vd.visit_date) {
        const year = new Date(vd.visit_date).getFullYear();
        if (!earliestYear || year < earliestYear) {
          earliestYear = year;
          earliestDate = vd.visit_date;
        }
      } else if (vd.approximate_year) {
        if (!earliestYear || vd.approximate_year < earliestYear) {
          earliestYear = vd.approximate_year;
        }
      }
    }

    // Build memories from visit_details with optional photos
    const countryIdToName = new Map(countries.map((c) => [c.id, c.name]));
    const countryIdToPhotos = new Map<string, Array<{ id: string; url: string; caption?: string }>>();
    for (const p of photos) {
      if (p.country_id) {
        if (!countryIdToPhotos.has(p.country_id)) countryIdToPhotos.set(p.country_id, []);
        countryIdToPhotos.get(p.country_id)!.push({ id: p.id, url: p.photo_url, caption: p.caption });
      }
    }

    const memories = visitDetails.map((vd) => ({
      id: vd.id,
      country_id: vd.country_id,
      country_name: countryIdToName.get(vd.country_id),
      trip_name: vd.trip_name,
      highlight: vd.highlight,
      visit_date: vd.visit_date,
      approximate_year: vd.approximate_year,
      photos: countryIdToPhotos.get(vd.country_id) || [],
    }));

    // Compute per-member country counts for family members
    const memberCountryCount = new Map<string, Set<string>>();
    for (const m of familyMembers) {
      memberCountryCount.set(m.id, new Set());
    }
    for (const cv of countryVisits) {
      if (cv.country_id && cv.family_member_id) {
        memberCountryCount.get(cv.family_member_id)?.add(cv.country_id);
      }
    }
    for (const vm of visitMembers) {
      const countryId = visitIdToCountryId.get(vm.visit_id);
      if (countryId && vm.family_member_id) {
        memberCountryCount.get(vm.family_member_id)?.add(countryId);
      }
    }

    const familyMembersWithCount = familyMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      avatar: m.avatar,
      color: m.color,
      countriesVisited: memberCountryCount.get(m.id)?.size || 0,
    }));

    // Compute home country ISO3
    let homeCountryISO3: string | undefined;
    if (ownerProfile.home_country) {
      homeCountryISO3 = nameToIso3[ownerProfile.home_country];
    }

    // Verify map codes match counts
    const mapCodesMatch = visitedCountryCodes.length === visitedCountriesList.length;
    if (!mapCodesMatch) {
      console.warn(`[get-shared-dashboard] Map codes mismatch: codes=${visitedCountryCodes.length}, countries=${visitedCountriesList.length}`);
    }

    const response: ResponsePayload = {
      ok: true,
      debug: {
        token_normalized,
        token_found: true,
        is_active: true,
        owner_user_id,
        owner_found: true,
        visited_source_tables: ["countries", "country_visits", "country_visit_details", "visit_family_members"],
        visited_query_counts: {
          visitedCountries: visitedCountriesList.length,
          visitedStates: uniqueStateVisits.size,
          visitedContinents: visitedContinents.length,
          wishlistCountries: wishlistCountriesList.length,
          memories: memories.length,
        },
        map_codes_match: mapCodesMatch,
      },
      data: {
        owner: {
          displayName: ownerProfile.full_name || "Traveler",
          avatarUrl: ownerProfile.avatar_url,
          homeCountry: ownerProfile.home_country,
        },
        shareSettings: {
          show_stats: shareRow.show_stats ?? true,
          show_map: shareRow.show_map ?? true,
          show_countries: shareRow.show_countries ?? true,
          show_photos: shareRow.show_photos ?? true,
          show_timeline: shareRow.show_timeline ?? true,
          show_family_members: shareRow.show_family_members ?? false,
          show_achievements: shareRow.show_achievements ?? true,
          show_wishlist: shareRow.show_wishlist ?? true,
        },
        visited: {
          countries: visitedCountriesList.map((c) => ({ id: c.id, name: c.name, flag: c.flag, continent: c.continent })),
          states: [...uniqueStateVisits.values()],
          continents: visitedContinents,
        },
        wishlist: {
          countries: wishlistCountriesList.map((c) => ({ id: c.id, name: c.name, flag: c.flag, continent: c.continent })),
        },
        since: {
          year: earliestYear,
          date: earliestDate,
          label: earliestYear ? `Since ${earliestYear}` : undefined,
        },
        memories,
        map: {
          homeCountryISO3,
          visitedCountryCodes,
          wishlistCountryCodes,
        },
        stats: {
          visitedCountriesCount: visitedCountriesList.length,
          visitedStatesCount: uniqueStateVisits.size,
          visitedContinentsCount: visitedContinents.length,
          wishlistCountriesCount: wishlistCountriesList.length,
        },
        familyMembers: shareRow.show_family_members ? familyMembersWithCount : undefined,
      },
    };

    console.log(`[get-shared-dashboard] Success: ${visitedCountriesList.length} countries, ${uniqueStateVisits.size} states`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-shared-dashboard] Error:", message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        debug: { token_normalized: "", token_found: false, errors: [message] },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
