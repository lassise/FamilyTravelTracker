import { parse, parseISO, isValid, differenceInDays } from "date-fns";
import { getAllCountries, searchCountries } from "@/lib/countriesData";

export interface TripSuggestion {
  id: string;
  countryName: string;
  countryCode?: string;
  visitDate: string | null;
  endDate: string | null;
  approximateMonth: number | null;
  approximateYear: number | null;
  tripName: string | null;
  sourceType: "pasted_text" | "photo_exif";
  sourceLabel: string;
  photoCount?: number;
  photoFileNames?: string[];
  /** True if this trip already exists in user's travels */
  alreadyExists?: boolean;
  /** Message explaining why it's a duplicate */
  duplicateReason?: string;
}

/**
 * Represents an existing trip from the user's travel history.
 * Used for duplicate detection.
 */
export interface ExistingTrip {
  countryId: string;
  countryName: string;
  countryCode?: string;
  visitDate: string | null;
  endDate: string | null;
  approximateMonth: number | null;
  approximateYear: number | null;
  tripName: string | null;
}

const DATE_PATTERNS: { pattern: RegExp; parseFn: (match: RegExpMatchArray) => { visit: string | null; end: string | null; approxMonth: number | null; approxYear: number | null } }[] = [
  // 3/25/13 to 3/30/13 or 3/25/13 - 3/30/13
  {
    pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:to|-|–|—|through|thru)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,
    parseFn(m) {
      const y1 = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
      const y2 = m[6].length === 2 ? 2000 + parseInt(m[6], 10) : parseInt(m[6], 10);
      const visit = `${y1}-${String(parseInt(m[1], 10)).padStart(2, "0")}-${String(parseInt(m[2], 10)).padStart(2, "0")}`;
      const end = `${y2}-${String(parseInt(m[4], 10)).padStart(2, "0")}-${String(parseInt(m[5], 10)).padStart(2, "0")}`;
      try {
        const d1 = parse(visit, "yyyy-MM-dd", new Date());
        const d2 = parse(end, "yyyy-MM-dd", new Date());
        if (isValid(d1) && isValid(d2)) return { visit, end, approxMonth: null, approxYear: null };
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // Mar 25, 2013 - Mar 30, 2013 (with or without comma)
  {
    pattern: /([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})\s*(?:to|-|–|—|through|thru)\s*([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/i,
    parseFn(m) {
      try {
        const d1 = parse(`${m[1]} ${m[2]}, ${m[3]}`, "MMM d, yyyy", new Date());
        const d2 = parse(`${m[4]} ${m[5]}, ${m[6]}`, "MMM d, yyyy", new Date());
        if (isValid(d1) && isValid(d2)) {
          const visit = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
          const end = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
          return { visit, end, approxMonth: null, approxYear: null };
        }
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // Mar 25 - Mar 30, 2013 (same year, year at end)
  {
    pattern: /([A-Za-z]{3,9})\s+(\d{1,2})\s*(?:to|-|–|—|through|thru)\s*([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/i,
    parseFn(m) {
      try {
        const year = m[5];
        const d1 = parse(`${m[1]} ${m[2]}, ${year}`, "MMM d, yyyy", new Date());
        const d2 = parse(`${m[3]} ${m[4]}, ${year}`, "MMM d, yyyy", new Date());
        if (isValid(d1) && isValid(d2)) {
          const visit = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
          const end = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
          return { visit, end, approxMonth: null, approxYear: null };
        }
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // 25-30 Mar 2013 or Mar 25-30, 2013 (same month range)
  {
    pattern: /([A-Za-z]{3,9})\s+(\d{1,2})\s*(?:to|-|–|—|through|thru)\s*(\d{1,2}),?\s*(\d{4})/i,
    parseFn(m) {
      try {
        const month = m[1];
        const year = m[4];
        const d1 = parse(`${month} ${m[2]}, ${year}`, "MMM d, yyyy", new Date());
        const d2 = parse(`${month} ${m[3]}, ${year}`, "MMM d, yyyy", new Date());
        if (isValid(d1) && isValid(d2)) {
          const visit = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
          const end = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
          return { visit, end, approxMonth: null, approxYear: null };
        }
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // 2013-03-25 to 2013-03-30
  {
    pattern: /(\d{4})-(\d{2})-(\d{2})\s*(?:to|-|–|—|through|thru)\s*(\d{4})-(\d{2})-(\d{2})/i,
    parseFn(m) {
      const visit = `${m[1]}-${m[2]}-${m[3]}`;
      const end = `${m[4]}-${m[5]}-${m[6]}`;
      try {
        const d1 = parseISO(visit);
        const d2 = parseISO(end);
        if (isValid(d1) && isValid(d2)) return { visit, end, approxMonth: null, approxYear: null };
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // 25.03.2013 - 30.03.2013 (European format)
  {
    pattern: /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(?:to|-|–|—|through|thru)\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
    parseFn(m) {
      const visit = `${m[3]}-${String(parseInt(m[2], 10)).padStart(2, "0")}-${String(parseInt(m[1], 10)).padStart(2, "0")}`;
      const end = `${m[6]}-${String(parseInt(m[5], 10)).padStart(2, "0")}-${String(parseInt(m[4], 10)).padStart(2, "0")}`;
      try {
        const d1 = parseISO(visit);
        const d2 = parseISO(end);
        if (isValid(d1) && isValid(d2)) return { visit, end, approxMonth: null, approxYear: null };
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // 25/03/2013 - 30/03/2013 (European slash format - DD/MM/YYYY)
  {
    pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:to|-|–|—|through|thru)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    parseFn(m) {
      // Try DD/MM/YYYY format (European)
      const visit = `${m[3]}-${String(parseInt(m[2], 10)).padStart(2, "0")}-${String(parseInt(m[1], 10)).padStart(2, "0")}`;
      const end = `${m[6]}-${String(parseInt(m[5], 10)).padStart(2, "0")}-${String(parseInt(m[4], 10)).padStart(2, "0")}`;
      try {
        const d1 = parseISO(visit);
        const d2 = parseISO(end);
        if (isValid(d1) && isValid(d2) && parseInt(m[1], 10) <= 31 && parseInt(m[2], 10) <= 12) {
          return { visit, end, approxMonth: null, approxYear: null };
        }
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // Boarding pass single date: 25MAR or 25MAR13 or 25MAR2013
  {
    pattern: /(\d{1,2})([A-Z]{3})(\d{2,4})?/i,
    parseFn(m) {
      try {
        const day = m[1];
        const month = m[2];
        let year = m[3];
        if (!year) year = String(new Date().getFullYear());
        else if (year.length === 2) year = "20" + year;
        const d = parse(`${month} ${day}, ${year}`, "MMM d, yyyy", new Date());
        if (isValid(d)) {
          const visit = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return { visit, end: visit, approxMonth: null, approxYear: null };
        }
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
];

// Single date or approximate (e.g. "March 2013", "2013")
function parseSingleDateOrApprox(text: string): { visit: string | null; end: string | null; approxMonth: number | null; approxYear: number | null } {
  // Month Year: March 2013, Mar 2013
  const monthYear = text.match(/([A-Za-z]{3,9})\s+(\d{4})/i);
  if (monthYear) {
    try {
      const d = parse(`${monthYear[1]} 1, ${monthYear[2]}`, "MMM d, yyyy", new Date());
      if (isValid(d)) {
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const lastDay = new Date(year, month, 0).getDate();
        const visit = `${year}-${String(month).padStart(2, "0")}-01`;
        const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        return { visit, end, approxMonth: month, approxYear: year };
      }
    } catch {}
  }
  // Year only
  const yearOnly = text.match(/\b(19|20)\d{2}\b/);
  if (yearOnly) {
    const y = parseInt(yearOnly[0], 10);
    return { visit: null, end: null, approxMonth: null, approxYear: y };
  }
  return { visit: null, end: null, approxMonth: null, approxYear: null };
}

const allCountries = getAllCountries();

// Common country aliases and variations
const COUNTRY_ALIASES: Record<string, string[]> = {
  GB: ["uk", "britain", "great britain", "united kingdom", "england", "scotland", "wales"],
  US: ["usa", "america", "united states of america", "united states", "the states"],
  AE: ["uae", "dubai", "abu dhabi", "united arab emirates"],
  NL: ["holland", "the netherlands", "netherlands"],
  CZ: ["czech republic", "czechia"],
  KR: ["south korea", "korea"],
  TW: ["taiwan"],
  HK: ["hong kong"],
  VA: ["vatican", "vatican city"],
  RU: ["russia"],
  CN: ["china", "mainland china"],
  JP: ["japan"],
  TH: ["thailand"],
  VN: ["vietnam"],
  PH: ["philippines"],
  SG: ["singapore"],
  MY: ["malaysia"],
  ID: ["indonesia", "bali"],
  MX: ["mexico", "cancun"],
  DO: ["dominican republic", "punta cana"],
  JM: ["jamaica"],
  BS: ["bahamas"],
  CU: ["cuba"],
  PR: ["puerto rico"],
  VI: ["us virgin islands", "usvi"],
  VG: ["british virgin islands", "bvi"],
  KY: ["cayman islands", "grand cayman"],
  TC: ["turks and caicos"],
  AW: ["aruba"],
  CW: ["curacao"],
  BB: ["barbados"],
  LC: ["st lucia", "saint lucia"],
  GR: ["greece", "santorini", "mykonos", "athens"],
  IT: ["italy", "rome", "milan", "venice", "florence", "amalfi"],
  ES: ["spain", "barcelona", "madrid", "ibiza", "mallorca"],
  PT: ["portugal", "lisbon", "porto"],
  FR: ["france", "paris", "nice", "marseille"],
  DE: ["germany", "berlin", "munich", "frankfurt"],
  AT: ["austria", "vienna", "salzburg"],
  CH: ["switzerland", "zurich", "geneva"],
  BE: ["belgium", "brussels", "bruges"],
  IE: ["ireland", "dublin"],
  IS: ["iceland", "reykjavik"],
  NO: ["norway", "oslo"],
  SE: ["sweden", "stockholm"],
  DK: ["denmark", "copenhagen"],
  FI: ["finland", "helsinki"],
  PL: ["poland", "warsaw", "krakow"],
  HR: ["croatia", "dubrovnik", "split"],
  ME: ["montenegro"],
  SI: ["slovenia"],
  HU: ["hungary", "budapest"],
  RO: ["romania", "bucharest"],
  BG: ["bulgaria"],
  TR: ["turkey", "istanbul"],
  EG: ["egypt", "cairo"],
  MA: ["morocco", "marrakech"],
  ZA: ["south africa", "cape town", "johannesburg"],
  KE: ["kenya", "nairobi"],
  TZ: ["tanzania", "zanzibar"],
  AU: ["australia", "sydney", "melbourne"],
  NZ: ["new zealand", "auckland", "queenstown"],
  FJ: ["fiji"],
  MV: ["maldives"],
  LK: ["sri lanka"],
  IN: ["india", "delhi", "mumbai", "goa"],
  NP: ["nepal", "kathmandu"],
  IL: ["israel", "tel aviv", "jerusalem"],
  JO: ["jordan", "amman", "petra"],
  BR: ["brazil", "rio", "sao paulo"],
  AR: ["argentina", "buenos aires"],
  CL: ["chile", "santiago"],
  PE: ["peru", "lima", "machu picchu", "cusco"],
  CO: ["colombia", "bogota", "medellin", "cartagena"],
  CR: ["costa rica"],
  PA: ["panama", "panama city"],
  BZ: ["belize"],
  EC: ["ecuador", "galapagos"],
  CA: ["canada", "toronto", "vancouver", "montreal"],
};

function findCountryInText(text: string): { name: string; code: string } | null {
  const lower = text.toLowerCase();
  
  // Check aliases first (more specific matches)
  for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
    for (const alias of aliases) {
      // Use word boundary matching to avoid partial matches
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        const country = allCountries.find(c => c.code === code);
        if (country) return { name: country.name, code: country.code };
      }
    }
  }
  
  // Check exact country names
  for (const c of allCountries) {
    const regex = new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) return { name: c.name, code: c.code };
  }
  
  // Try individual words
  const words = text.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[,.:;!?()]/g, "");
    if (cleaned.length < 3) continue; // Skip short words
    const found = searchCountries(cleaned)[0];
    if (found) return { name: found.name, code: found.code };
  }
  return null;
}

/**
 * Check if two date ranges overlap or are very close (within 3 days).
 * Returns true if they likely represent the same trip.
 */
function datesOverlapOrClose(
  start1: string | null,
  end1: string | null,
  start2: string | null,
  end2: string | null,
  toleranceDays: number = 3
): boolean {
  if (!start1 || !start2) return false;
  
  try {
    const s1 = parseISO(start1);
    const e1 = end1 ? parseISO(end1) : s1;
    const s2 = parseISO(start2);
    const e2 = end2 ? parseISO(end2) : s2;
    
    if (!isValid(s1) || !isValid(s2)) return false;
    
    // Check if ranges overlap
    if (s1 <= e2 && s2 <= e1) return true;
    
    // Check if they're within tolerance
    const gapDays = Math.min(
      Math.abs(differenceInDays(s1, e2)),
      Math.abs(differenceInDays(s2, e1)),
      Math.abs(differenceInDays(s1, s2)),
      Math.abs(differenceInDays(e1, e2))
    );
    
    return gapDays <= toleranceDays;
  } catch {
    return false;
  }
}

/**
 * Check if approximate dates match (same month/year or same year if only year is known).
 */
function approximateDatesMatch(
  month1: number | null,
  year1: number | null,
  month2: number | null,
  year2: number | null
): boolean {
  if (year1 == null || year2 == null) return false;
  if (year1 !== year2) return false;
  // If both have months, they must match
  if (month1 != null && month2 != null) return month1 === month2;
  // If only one has a month, still consider it a potential match within same year
  return true;
}

/**
 * Check if a suggestion matches an existing trip.
 * Returns the reason for the match, or null if no match.
 */
export function checkDuplicateTrip(
  suggestion: TripSuggestion,
  existingTrips: ExistingTrip[]
): { isDuplicate: boolean; reason: string | null } {
  const suggestionCode = suggestion.countryCode?.toUpperCase();
  const suggestionName = suggestion.countryName.toLowerCase();
  
  for (const existing of existingTrips) {
    // Check if countries match
    const existingCode = existing.countryCode?.toUpperCase();
    const existingName = existing.countryName.toLowerCase();
    
    const countryMatch = 
      (suggestionCode && existingCode && suggestionCode === existingCode) ||
      suggestionName === existingName;
    
    if (!countryMatch) continue;
    
    // Check if dates match
    const hasExactDates = suggestion.visitDate || existing.visitDate;
    const hasApproxDates = (suggestion.approximateYear != null) || (existing.approximateYear != null);
    
    if (hasExactDates) {
      // Compare exact dates
      if (datesOverlapOrClose(
        suggestion.visitDate,
        suggestion.endDate,
        existing.visitDate,
        existing.endDate
      )) {
        const dateStr = existing.visitDate
          ? `around ${existing.visitDate.slice(0, 7)}`
          : existing.approximateYear
          ? `in ${existing.approximateYear}`
          : "";
        return {
          isDuplicate: true,
          reason: `Trip to ${existing.countryName} ${dateStr} already logged`
        };
      }
    } else if (hasApproxDates) {
      // Compare approximate dates
      if (approximateDatesMatch(
        suggestion.approximateMonth,
        suggestion.approximateYear,
        existing.approximateMonth,
        existing.approximateYear
      )) {
        const dateStr = existing.approximateMonth
          ? `${existing.approximateMonth}/${existing.approximateYear}`
          : String(existing.approximateYear);
        return {
          isDuplicate: true,
          reason: `Trip to ${existing.countryName} (${dateStr}) already logged`
        };
      }
    }
  }
  
  return { isDuplicate: false, reason: null };
}

/**
 * Mark suggestions as duplicates based on existing trips.
 */
export function markDuplicateSuggestions(
  suggestions: TripSuggestion[],
  existingTrips: ExistingTrip[]
): TripSuggestion[] {
  return suggestions.map(s => {
    const { isDuplicate, reason } = checkDuplicateTrip(s, existingTrips);
    return {
      ...s,
      alreadyExists: isDuplicate,
      duplicateReason: reason ?? undefined
    };
  });
}

// OOO-specific patterns that mention both destination and dates
const OOO_PATTERNS: { pattern: RegExp; extractFn: (match: RegExpMatchArray) => { country: string; dateText: string } | null }[] = [
  // "OOO in Iceland from 3/25/13 to 3/30/13" or "out of office in Japan from..."
  {
    pattern: /(?:ooo|out\s+of\s+office|away|traveling|travelling|vacation|holiday|visiting)\s+(?:in|to|at)?\s*([A-Za-z][A-Za-z\s]+?)\s+(?:from|during|for|on|between)\s+(.+?)(?:\.|$)/i,
    extractFn(m) {
      return { country: m[1].trim(), dateText: m[2].trim() };
    }
  },
  // "I will be in France from Mar 25-30, 2024" or "going to Japan"
  {
    pattern: /(?:i\s+will\s+be|going\s+to|heading\s+to|off\s+to)\s+(?:in\s+)?([A-Za-z][A-Za-z\s]+?)\s+(?:from|during|for|on|between)\s+(.+?)(?:\.|$)/i,
    extractFn(m) {
      return { country: m[1].trim(), dateText: m[2].trim() };
    }
  },
  // "Japan trip: March 25-30, 2024" or "Iceland vacation 3/25/24 - 3/30/24"
  {
    pattern: /([A-Za-z][A-Za-z\s]+?)\s+(?:trip|vacation|holiday|visit|getaway|adventure)[:\s]+(.+?)(?:\.|$)/i,
    extractFn(m) {
      return { country: m[1].trim(), dateText: m[2].trim() };
    }
  },
  // Flight itinerary: "Flight to Paris 25MAR24"
  {
    pattern: /(?:flight|flying)\s+to\s+([A-Za-z][A-Za-z\s]+?)\s+(\d{1,2}[A-Z]{3}\d{0,4})/i,
    extractFn(m) {
      return { country: m[1].trim(), dateText: m[2].trim() };
    }
  },
];

/**
 * Extract a trip name from text if one is present (e.g., "Summer 2024 Trip", "Anniversary Vacation").
 */
function extractTripName(text: string): string | null {
  const patterns = [
    /(?:my|our|the)\s+([\w\s]+(?:trip|vacation|holiday|getaway|adventure))/i,
    /([A-Za-z]+\s+\d{4}\s+(?:trip|vacation|holiday))/i,
    /((?:honeymoon|anniversary|birthday|graduation|retirement)\s*(?:trip|vacation)?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50) {
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
    }
  }
  return null;
}

/**
 * Split text into chunks that might each contain a separate trip.
 */
function splitIntoTripChunks(text: string): string[] {
  // Split on common separators between trip mentions
  // Using simpler patterns to avoid regex issues
  const chunks: string[] = [];
  
  // First split on double newlines
  const paragraphs = text.split(/\n\n+/);
  
  for (const para of paragraphs) {
    // Then split on bullet points or numbered lists
    const lines = para.split(/(?:^|\n)\s*(?:[-•*]|\d+[.)])\s*/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5) {
        chunks.push(trimmed);
      }
    }
  }
  
  // If no splits found, return the whole text as one chunk
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Extract trip suggestions from pasted text (OOO, boarding pass, etc.).
 * Handles multiple trips in a single text block.
 */
export function parsePastedText(text: string): TripSuggestion[] {
  if (!text?.trim()) return [];
  
  const results: TripSuggestion[] = [];
  const seenTrips = new Set<string>(); // Avoid duplicates within same paste
  const chunks = splitIntoTripChunks(text);
  
  for (const chunk of chunks) {
    const chunkResults = parseTextChunk(chunk);
    for (const result of chunkResults) {
      // Create a key to dedupe within the same paste operation
      const key = `${result.countryCode}|${result.visitDate || result.approximateYear || 'no-date'}`;
      if (!seenTrips.has(key)) {
        seenTrips.add(key);
        results.push(result);
      }
    }
  }
  
  return results;
}

/**
 * Parse a single chunk of text for trip information.
 */
function parseTextChunk(text: string): TripSuggestion[] {
  const results: TripSuggestion[] = [];
  
  // First, try OOO-specific patterns (more accurate)
  for (const { pattern, extractFn } of OOO_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const extracted = extractFn(m);
      if (extracted) {
        const country = findCountryInText(extracted.country);
        if (country) {
          // Parse dates from the extracted date text
          let visitDate: string | null = null;
          let endDate: string | null = null;
          let approximateMonth: number | null = null;
          let approximateYear: number | null = null;
          
          for (const { pattern: datePattern, parseFn } of DATE_PATTERNS) {
            const dateMatch = extracted.dateText.match(datePattern);
            if (dateMatch) {
              const parsed = parseFn(dateMatch);
              if (parsed.visit || parsed.approxYear != null) {
                visitDate = parsed.visit;
                endDate = parsed.end;
                approximateMonth = parsed.approxMonth;
                approximateYear = parsed.approxYear;
                break;
              }
            }
          }
          
          // If no date range found, try single date/approximate
          if (!visitDate && approximateYear == null) {
            const single = parseSingleDateOrApprox(extracted.dateText);
            visitDate = single.visit;
            endDate = single.end;
            approximateMonth = single.approxMonth;
            approximateYear = single.approxYear;
          }
          
          const tripName = extractTripName(text);
          const id = `paste_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          
          results.push({
            id,
            countryName: country.name,
            countryCode: country.code,
            visitDate,
            endDate,
            approximateMonth,
            approximateYear,
            tripName,
            sourceType: "pasted_text",
            sourceLabel: tripName ? `${tripName}` : "From pasted text",
          });
          
          // Found a match with OOO pattern, don't try fallback
          return results;
        }
      }
    }
  }
  
  // Fallback: try to find any country + any date in the text
  const country = findCountryInText(text);
  if (!country) return [];

  let visitDate: string | null = null;
  let endDate: string | null = null;
  let approximateMonth: number | null = null;
  let approximateYear: number | null = null;

  for (const { pattern, parseFn } of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const parsed = parseFn(m);
      if (parsed.visit || parsed.approxYear != null) {
        visitDate = parsed.visit;
        endDate = parsed.end;
        approximateMonth = parsed.approxMonth;
        approximateYear = parsed.approxYear;
        break;
      }
    }
  }
  
  if (visitDate === null && endDate === null && approximateYear === null) {
    const single = parseSingleDateOrApprox(text);
    visitDate = single.visit;
    endDate = single.end;
    approximateMonth = single.approxMonth;
    approximateYear = single.approxYear;
  }

  const tripName = extractTripName(text);
  const id = `paste_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  results.push({
    id,
    countryName: country.name,
    countryCode: country.code,
    visitDate,
    endDate,
    approximateMonth,
    approximateYear,
    tripName,
    sourceType: "pasted_text",
    sourceLabel: tripName ? `${tripName}` : "From pasted text",
  });
  
  return results;
}
