/**
 * Email Trip Parser
 * 
 * Parses travel-related emails to extract trip suggestions.
 * Handles common formats from airlines, hotels, and booking sites.
 */

import { parse, parseISO, isValid, format, addDays } from "date-fns";
import { getAllCountries, searchCountries } from "@/lib/countriesData";
import type { TripSuggestion } from "@/lib/tripSuggestionsParser";

const allCountries = getAllCountries();

// Common airline codes mapped to hub countries
const AIRLINE_HUBS: Record<string, string> = {
  // US Airlines
  "AA": "US", "UA": "US", "DL": "US", "WN": "US", "B6": "US", "AS": "US", "NK": "US", "F9": "US",
  // European Airlines
  "BA": "GB", "LH": "DE", "AF": "FR", "KL": "NL", "IB": "ES", "AZ": "IT", "SK": "SE", "AY": "FI",
  "EI": "IE", "TP": "PT", "OS": "AT", "LX": "CH", "SN": "BE", "OK": "CZ",
  // Asian Airlines
  "SQ": "SG", "CX": "HK", "NH": "JP", "JL": "JP", "KE": "KR", "OZ": "KR", "TG": "TH", "MH": "MY",
  "GA": "ID", "PR": "PH", "VN": "VN", "CI": "TW", "BR": "TW", "AI": "IN",
  // Middle Eastern Airlines
  "EK": "AE", "QR": "QA", "EY": "AE", "TK": "TR", "EL": "IL", "SV": "SA",
  // Other
  "QF": "AU", "NZ": "NZ", "AC": "CA", "AM": "MX", "LA": "CL", "AV": "CO",
};

// Common airport codes to country
const AIRPORT_COUNTRIES: Record<string, string> = {
  // Major US airports
  "JFK": "US", "LAX": "US", "ORD": "US", "DFW": "US", "ATL": "US", "SFO": "US", "MIA": "US", "BOS": "US",
  "SEA": "US", "DEN": "US", "EWR": "US", "LGA": "US", "IAH": "US", "PHX": "US", "LAS": "US",
  // Europe
  "LHR": "GB", "LGW": "GB", "STN": "GB", "MAN": "GB", "EDI": "GB",
  "CDG": "FR", "ORY": "FR", "NCE": "FR", "MRS": "FR",
  "FRA": "DE", "MUC": "DE", "BER": "DE", "TXL": "DE", "DUS": "DE", "HAM": "DE",
  "AMS": "NL", "MAD": "ES", "BCN": "ES", "PMI": "ES", "AGP": "ES", "IBZ": "ES",
  "FCO": "IT", "MXP": "IT", "VCE": "IT", "NAP": "IT", "FLR": "IT",
  "LIS": "PT", "OPO": "PT", "ZRH": "CH", "GVA": "CH", "VIE": "AT", "BRU": "BE",
  "CPH": "DK", "ARN": "SE", "OSL": "NO", "HEL": "FI", "PRG": "CZ", "WAW": "PL",
  "ATH": "GR", "IST": "TR", "DUB": "IE", "KEF": "IS",
  // Asia
  "HND": "JP", "NRT": "JP", "KIX": "JP", "ICN": "KR", "GMP": "KR",
  "HKG": "HK", "TPE": "TW", "SIN": "SG", "BKK": "TH", "KUL": "MY",
  "CGK": "ID", "DPS": "ID", "MNL": "PH", "SGN": "VN", "HAN": "VN",
  "DEL": "IN", "BOM": "IN", "PEK": "CN", "PVG": "CN", "CAN": "CN",
  // Middle East
  "DXB": "AE", "AUH": "AE", "DOH": "QA", "TLV": "IL", "CAI": "EG", "CMN": "MA",
  // Oceania
  "SYD": "AU", "MEL": "AU", "BNE": "AU", "AKL": "NZ", "CHC": "NZ",
  // Americas
  "YYZ": "CA", "YVR": "CA", "YUL": "CA", "MEX": "MX", "CUN": "MX",
  "GRU": "BR", "GIG": "BR", "EZE": "AR", "SCL": "CL", "BOG": "CO", "LIM": "PE",
  // Caribbean
  "SJU": "PR", "NAS": "BS", "MBJ": "JM", "PUJ": "DO", "AUA": "AW",
};

interface EmailPattern {
  name: string;
  pattern: RegExp;
  extractFn: (match: RegExpMatchArray, fullText: string) => Partial<TripSuggestion> | null;
  confidence: number;
}

/**
 * Extract country from airport code
 */
function getCountryFromAirport(code: string): { name: string; code: string } | null {
  const countryCode = AIRPORT_COUNTRIES[code.toUpperCase()];
  if (!countryCode) return null;
  const country = allCountries.find(c => c.code === countryCode);
  return country ? { name: country.name, code: country.code } : null;
}

/**
 * Parse flight route like "JFK → CDG" or "JFK-CDG" or "JFK to CDG"
 */
function parseFlightRoute(text: string): { origin: string; destination: string } | null {
  const patterns = [
    /([A-Z]{3})\s*(?:→|->|–|—|to)\s*([A-Z]{3})/i,
    /from\s+([A-Z]{3})\s+to\s+([A-Z]{3})/i,
    /departing\s+([A-Z]{3}).*arriving\s+([A-Z]{3})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { origin: match[1].toUpperCase(), destination: match[2].toUpperCase() };
    }
  }
  return null;
}

/**
 * Parse date from various email formats
 */
function parseDateFromEmail(text: string): string | null {
  const patterns = [
    // "March 25, 2024" or "Mar 25, 2024"
    { regex: /([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i, format: "MMM d, yyyy" },
    // "25 March 2024" or "25 Mar 2024"
    { regex: /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i, format: "d MMM yyyy" },
    // "2024-03-25"
    { regex: /(\d{4})-(\d{2})-(\d{2})/, format: "ISO" },
    // "03/25/2024" or "3/25/24"
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, format: "MM/dd/yyyy" },
    // "25MAR" or "25MAR24"
    { regex: /(\d{1,2})([A-Z]{3})(\d{2,4})?/i, format: "boarding" },
  ];
  
  for (const { regex, format: fmt } of patterns) {
    const match = text.match(regex);
    if (match) {
      try {
        if (fmt === "ISO") {
          const d = parseISO(`${match[1]}-${match[2]}-${match[3]}`);
          if (isValid(d)) return format(d, "yyyy-MM-dd");
        } else if (fmt === "boarding") {
          const day = match[1];
          const month = match[2];
          let year = match[3] || String(new Date().getFullYear());
          if (year.length === 2) year = "20" + year;
          const d = parse(`${month} ${day}, ${year}`, "MMM d, yyyy", new Date());
          if (isValid(d)) return format(d, "yyyy-MM-dd");
        } else if (fmt === "MM/dd/yyyy") {
          let year = match[3];
          if (year.length === 2) year = "20" + year;
          const d = new Date(parseInt(year), parseInt(match[1]) - 1, parseInt(match[2]));
          if (isValid(d)) return format(d, "yyyy-MM-dd");
        } else {
          const dateStr = fmt === "d MMM yyyy" 
            ? `${match[1]} ${match[2]} ${match[3]}`
            : `${match[1]} ${match[2]}, ${match[3]}`;
          const d = parse(dateStr, fmt, new Date());
          if (isValid(d)) return format(d, "yyyy-MM-dd");
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Email patterns for different travel-related emails
 */
const EMAIL_PATTERNS: EmailPattern[] = [
  // Flight confirmation with route
  {
    name: "flight_route",
    pattern: /(?:flight|booking)\s+(?:confirmation|itinerary).*?([A-Z]{3})\s*(?:→|->|–|—|to)\s*([A-Z]{3})/is,
    confidence: 0.9,
    extractFn(match, fullText) {
      const destCountry = getCountryFromAirport(match[2]);
      if (!destCountry) return null;
      const date = parseDateFromEmail(fullText);
      return {
        countryName: destCountry.name,
        countryCode: destCountry.code,
        visitDate: date,
        endDate: date,
        sourceLabel: `Flight to ${match[2]}`,
      };
    }
  },
  
  // Airline confirmation number with destination
  {
    name: "airline_confirmation",
    pattern: /confirmation\s*(?:number|code|#)?:?\s*([A-Z0-9]{6}).*?(?:to|arriving|destination)\s+([A-Za-z\s]+?)(?:\s+\(([A-Z]{3})\))?/is,
    confidence: 0.85,
    extractFn(match, fullText) {
      const airportCode = match[3];
      if (airportCode) {
        const country = getCountryFromAirport(airportCode);
        if (country) {
          const date = parseDateFromEmail(fullText);
          return {
            countryName: country.name,
            countryCode: country.code,
            visitDate: date,
            endDate: date,
            sourceLabel: `Flight confirmation ${match[1]}`,
          };
        }
      }
      // Try to find country in destination text
      const destText = match[2].trim();
      const country = searchCountries(destText)[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate: date,
          sourceLabel: `Flight confirmation ${match[1]}`,
        };
      }
      return null;
    }
  },
  
  // Hotel booking confirmation
  {
    name: "hotel_booking",
    pattern: /(?:hotel|accommodation|stay)\s+(?:confirmation|booking|reservation).*?(?:in|at)\s+([A-Za-z\s,]+?)(?:\s+from\s+|\s+on\s+|,\s*)/is,
    confidence: 0.8,
    extractFn(match, fullText) {
      const location = match[1].trim();
      // Try to find country in location
      const country = searchCountries(location)[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        // Look for check-out date
        const checkOutMatch = fullText.match(/check.?out:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        let endDate = date;
        if (checkOutMatch) {
          endDate = parseDateFromEmail(checkOutMatch[1]) || date;
        }
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate,
          sourceLabel: `Hotel in ${location}`,
        };
      }
      return null;
    }
  },
  
  // Booking.com confirmation
  {
    name: "booking_com",
    pattern: /booking\.com.*?(?:your\s+)?(?:reservation|booking)\s+(?:in|at|for)\s+([A-Za-z\s,]+)/is,
    confidence: 0.85,
    extractFn(match, fullText) {
      const location = match[1].trim();
      const country = searchCountries(location)[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate: date,
          sourceLabel: "Booking.com reservation",
        };
      }
      return null;
    }
  },
  
  // Airbnb confirmation
  {
    name: "airbnb",
    pattern: /airbnb.*?(?:reservation|booking|trip)\s+(?:in|to|at)\s+([A-Za-z\s,]+)/is,
    confidence: 0.85,
    extractFn(match, fullText) {
      const location = match[1].trim();
      const country = searchCountries(location)[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate: date,
          sourceLabel: "Airbnb reservation",
        };
      }
      return null;
    }
  },
  
  // Expedia booking
  {
    name: "expedia",
    pattern: /expedia.*?(?:trip|booking|itinerary)\s+(?:to|in|for)\s+([A-Za-z\s,]+)/is,
    confidence: 0.85,
    extractFn(match, fullText) {
      const location = match[1].trim();
      const country = searchCountries(location)[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate: date,
          sourceLabel: "Expedia booking",
        };
      }
      return null;
    }
  },
  
  // Visa/travel document
  {
    name: "visa_document",
    pattern: /(?:visa|travel\s+document|entry\s+permit).*?(?:for|to)\s+([A-Za-z\s]+?)(?:\s+valid|\s+from|\s+issued|$)/is,
    confidence: 0.7,
    extractFn(match, fullText) {
      const country = searchCountries(match[1].trim())[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate: date,
          sourceLabel: "Visa/travel document",
        };
      }
      return null;
    }
  },
  
  // Generic "traveling to [country]" pattern
  {
    name: "travel_mention",
    pattern: /(?:traveling|travelling|flying|going|headed|heading)\s+to\s+([A-Za-z\s]+?)(?:\s+on\s+|\s+from\s+|\s+for\s+|[,!.]|$)/is,
    confidence: 0.6,
    extractFn(match, fullText) {
      const country = searchCountries(match[1].trim())[0];
      if (country) {
        const date = parseDateFromEmail(fullText);
        return {
          countryName: country.name,
          countryCode: country.code,
          visitDate: date,
          endDate: date,
          sourceLabel: "Travel mention",
        };
      }
      return null;
    }
  },
  
  // Boarding pass pattern
  {
    name: "boarding_pass",
    pattern: /boarding\s+pass.*?([A-Z]{2}\d{3,4}).*?([A-Z]{3})\s*(?:→|->|–|—|to)\s*([A-Z]{3})/is,
    confidence: 0.95,
    extractFn(match, fullText) {
      const destCountry = getCountryFromAirport(match[3]);
      if (!destCountry) return null;
      const date = parseDateFromEmail(fullText);
      return {
        countryName: destCountry.name,
        countryCode: destCountry.code,
        visitDate: date,
        endDate: date,
        sourceLabel: `Boarding pass ${match[1]}`,
      };
    }
  },
];

/**
 * Parse email content for trip suggestions
 */
export function parseEmailContent(emailText: string): TripSuggestion[] {
  if (!emailText?.trim()) return [];
  
  const results: TripSuggestion[] = [];
  const seenCountryDates = new Set<string>();
  
  for (const pattern of EMAIL_PATTERNS) {
    const match = emailText.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extractFn(match, emailText);
      if (extracted && extracted.countryName) {
        // Dedupe by country + date
        const key = `${extracted.countryCode}|${extracted.visitDate || "unknown"}`;
        if (!seenCountryDates.has(key)) {
          seenCountryDates.add(key);
          
          results.push({
            id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            countryName: extracted.countryName,
            countryCode: extracted.countryCode,
            visitDate: extracted.visitDate ?? null,
            endDate: extracted.endDate ?? null,
            approximateMonth: null,
            approximateYear: extracted.visitDate ? null : new Date().getFullYear(),
            tripName: null,
            sourceType: "pasted_text",
            sourceLabel: extracted.sourceLabel || `From ${pattern.name}`,
            confidence: pattern.confidence,
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * Generate demo trip suggestions for testing
 */
export function generateDemoSuggestions(): TripSuggestion[] {
  const demoTrips: TripSuggestion[] = [
    {
      id: "demo_1",
      countryName: "France",
      countryCode: "FR",
      visitDate: "2024-06-15",
      endDate: "2024-06-22",
      approximateMonth: null,
      approximateYear: null,
      tripName: "Summer in Paris",
      sourceType: "photo_exif",
      sourceLabel: "From 47 photos",
      photoCount: 47,
      confidence: 0.95,
    },
    {
      id: "demo_2",
      countryName: "Japan",
      countryCode: "JP",
      visitDate: "2024-03-28",
      endDate: "2024-04-08",
      approximateMonth: null,
      approximateYear: null,
      tripName: "Cherry Blossom Trip",
      sourceType: "pasted_text",
      sourceLabel: "Flight confirmation AA1234",
      confidence: 0.9,
    },
    {
      id: "demo_3",
      countryName: "Italy",
      countryCode: "IT",
      visitDate: "2023-09-10",
      endDate: "2023-09-18",
      approximateMonth: null,
      approximateYear: null,
      tripName: null,
      sourceType: "photo_exif",
      sourceLabel: "From 89 photos",
      photoCount: 89,
      confidence: 0.92,
    },
    {
      id: "demo_4",
      countryName: "Mexico",
      countryCode: "MX",
      visitDate: "2023-12-20",
      endDate: "2023-12-28",
      approximateMonth: null,
      approximateYear: null,
      tripName: "Holiday Getaway",
      sourceType: "pasted_text",
      sourceLabel: "Airbnb reservation",
      confidence: 0.85,
    },
    {
      id: "demo_5",
      countryName: "Thailand",
      countryCode: "TH",
      visitDate: null,
      endDate: null,
      approximateMonth: 2,
      approximateYear: 2023,
      tripName: null,
      sourceType: "photo_exif",
      sourceLabel: "From 23 photos",
      photoCount: 23,
      confidence: 0.75,
    },
    {
      id: "demo_6",
      countryName: "Spain",
      countryCode: "ES",
      visitDate: "2022-07-04",
      endDate: "2022-07-11",
      approximateMonth: null,
      approximateYear: null,
      tripName: null,
      sourceType: "pasted_text",
      sourceLabel: "Booking.com confirmation",
      confidence: 0.88,
    },
    {
      id: "demo_7",
      countryName: "United Kingdom",
      countryCode: "GB",
      visitDate: "2024-08-15",
      endDate: "2024-08-20",
      approximateMonth: null,
      approximateYear: null,
      tripName: "London Trip",
      sourceType: "pasted_text",
      sourceLabel: "Hotel confirmation",
      confidence: 0.82,
    },
    {
      id: "demo_8",
      countryName: "Greece",
      countryCode: "GR",
      visitDate: null,
      endDate: null,
      approximateMonth: 6,
      approximateYear: 2022,
      tripName: "Santorini Vacation",
      sourceType: "photo_exif",
      sourceLabel: "From 156 photos",
      photoCount: 156,
      confidence: 0.7,
    },
  ];
  
  return demoTrips;
}

/**
 * Merge nearby trips to the same country
 */
export function mergeNearbyTrips(
  suggestions: TripSuggestion[],
  maxDaysApart: number = 7
): TripSuggestion[] {
  if (suggestions.length <= 1) return suggestions;
  
  // Group by country
  const byCountry: Record<string, TripSuggestion[]> = {};
  for (const s of suggestions) {
    const key = s.countryCode || s.countryName;
    if (!byCountry[key]) byCountry[key] = [];
    byCountry[key].push(s);
  }
  
  const merged: TripSuggestion[] = [];
  
  for (const trips of Object.values(byCountry)) {
    if (trips.length === 1) {
      merged.push(trips[0]);
      continue;
    }
    
    // Sort by date
    const sorted = [...trips].sort((a, b) => {
      const dateA = a.visitDate || `${a.approximateYear}-${String(a.approximateMonth || 6).padStart(2, "0")}-15`;
      const dateB = b.visitDate || `${b.approximateYear}-${String(b.approximateMonth || 6).padStart(2, "0")}-15`;
      return dateA.localeCompare(dateB);
    });
    
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      // Check if trips are close enough to merge
      if (current.endDate && next.visitDate) {
        try {
          const daysBetween = Math.abs(
            (parseISO(next.visitDate).getTime() - parseISO(current.endDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysBetween <= maxDaysApart) {
            // Merge trips
            const totalPhotos = (current.photoCount || 0) + (next.photoCount || 0);
            current = {
              ...current,
              endDate: next.endDate || current.endDate,
              photoCount: totalPhotos || undefined,
              sourceLabel: totalPhotos > 0 
                ? `From ${totalPhotos} photos` 
                : `${current.sourceLabel} + ${next.sourceLabel}`,
              confidence: Math.max(current.confidence || 0.5, next.confidence || 0.5),
            };
            continue;
          }
        } catch {
          // Can't parse dates, don't merge
        }
      }
      
      // Can't merge, push current and start new
      merged.push(current);
      current = next;
    }
    merged.push(current);
  }
  
  return merged;
}
