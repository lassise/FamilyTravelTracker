// Airport codes to country/city mapping
// This is a subset of major airports - the AI will handle most cases,
// but this provides a client-side fallback for common airports

export interface AirportInfo {
    code: string;
    city: string;
    country: string;
    countryCode: string; // ISO 3166-1 alpha-2
}

export const airportData: Record<string, AirportInfo> = {
    // United States
    "ATL": { code: "ATL", city: "Atlanta", country: "United States", countryCode: "US" },
    "LAX": { code: "LAX", city: "Los Angeles", country: "United States", countryCode: "US" },
    "ORD": { code: "ORD", city: "Chicago", country: "United States", countryCode: "US" },
    "DFW": { code: "DFW", city: "Dallas/Fort Worth", country: "United States", countryCode: "US" },
    "DEN": { code: "DEN", city: "Denver", country: "United States", countryCode: "US" },
    "JFK": { code: "JFK", city: "New York", country: "United States", countryCode: "US" },
    "SFO": { code: "SFO", city: "San Francisco", country: "United States", countryCode: "US" },
    "SEA": { code: "SEA", city: "Seattle", country: "United States", countryCode: "US" },
    "LAS": { code: "LAS", city: "Las Vegas", country: "United States", countryCode: "US" },
    "MCO": { code: "MCO", city: "Orlando", country: "United States", countryCode: "US" },
    "EWR": { code: "EWR", city: "Newark", country: "United States", countryCode: "US" },
    "MIA": { code: "MIA", city: "Miami", country: "United States", countryCode: "US" },
    "PHX": { code: "PHX", city: "Phoenix", country: "United States", countryCode: "US" },
    "IAH": { code: "IAH", city: "Houston", country: "United States", countryCode: "US" },
    "BOS": { code: "BOS", city: "Boston", country: "United States", countryCode: "US" },
    "FLL": { code: "FLL", city: "Fort Lauderdale", country: "United States", countryCode: "US" },
    "MSP": { code: "MSP", city: "Minneapolis", country: "United States", countryCode: "US" },
    "DTW": { code: "DTW", city: "Detroit", country: "United States", countryCode: "US" },
    "PHL": { code: "PHL", city: "Philadelphia", country: "United States", countryCode: "US" },
    "LGA": { code: "LGA", city: "New York", country: "United States", countryCode: "US" },
    "BWI": { code: "BWI", city: "Baltimore", country: "United States", countryCode: "US" },
    "SLC": { code: "SLC", city: "Salt Lake City", country: "United States", countryCode: "US" },
    "DCA": { code: "DCA", city: "Washington D.C.", country: "United States", countryCode: "US" },
    "IAD": { code: "IAD", city: "Washington D.C.", country: "United States", countryCode: "US" },
    "SAN": { code: "SAN", city: "San Diego", country: "United States", countryCode: "US" },
    "TPA": { code: "TPA", city: "Tampa", country: "United States", countryCode: "US" },
    "PDX": { code: "PDX", city: "Portland", country: "United States", countryCode: "US" },
    "HNL": { code: "HNL", city: "Honolulu", country: "United States", countryCode: "US" },
    "AUS": { code: "AUS", city: "Austin", country: "United States", countryCode: "US" },
    "DAL": { code: "DAL", city: "Dallas", country: "United States", countryCode: "US" },
    "MDW": { code: "MDW", city: "Chicago", country: "United States", countryCode: "US" },
    "STL": { code: "STL", city: "St. Louis", country: "United States", countryCode: "US" },
    "RDU": { code: "RDU", city: "Raleigh", country: "United States", countryCode: "US" },
    "SJC": { code: "SJC", city: "San Jose", country: "United States", countryCode: "US" },
    "OAK": { code: "OAK", city: "Oakland", country: "United States", countryCode: "US" },
    "SMF": { code: "SMF", city: "Sacramento", country: "United States", countryCode: "US" },

    // Canada
    "YYZ": { code: "YYZ", city: "Toronto", country: "Canada", countryCode: "CA" },
    "YVR": { code: "YVR", city: "Vancouver", country: "Canada", countryCode: "CA" },
    "YUL": { code: "YUL", city: "Montreal", country: "Canada", countryCode: "CA" },
    "YYC": { code: "YYC", city: "Calgary", country: "Canada", countryCode: "CA" },
    "YEG": { code: "YEG", city: "Edmonton", country: "Canada", countryCode: "CA" },
    "YOW": { code: "YOW", city: "Ottawa", country: "Canada", countryCode: "CA" },

    // Mexico
    "MEX": { code: "MEX", city: "Mexico City", country: "Mexico", countryCode: "MX" },
    "CUN": { code: "CUN", city: "Cancun", country: "Mexico", countryCode: "MX" },
    "GDL": { code: "GDL", city: "Guadalajara", country: "Mexico", countryCode: "MX" },
    "SJD": { code: "SJD", city: "Los Cabos", country: "Mexico", countryCode: "MX" },
    "PVR": { code: "PVR", city: "Puerto Vallarta", country: "Mexico", countryCode: "MX" },

    // United Kingdom
    "LHR": { code: "LHR", city: "London", country: "United Kingdom", countryCode: "GB" },
    "LGW": { code: "LGW", city: "London", country: "United Kingdom", countryCode: "GB" },
    "STN": { code: "STN", city: "London", country: "United Kingdom", countryCode: "GB" },
    "MAN": { code: "MAN", city: "Manchester", country: "United Kingdom", countryCode: "GB" },
    "EDI": { code: "EDI", city: "Edinburgh", country: "United Kingdom", countryCode: "GB" },
    "BHX": { code: "BHX", city: "Birmingham", country: "United Kingdom", countryCode: "GB" },
    "GLA": { code: "GLA", city: "Glasgow", country: "United Kingdom", countryCode: "GB" },

    // France
    "CDG": { code: "CDG", city: "Paris", country: "France", countryCode: "FR" },
    "ORY": { code: "ORY", city: "Paris", country: "France", countryCode: "FR" },
    "NCE": { code: "NCE", city: "Nice", country: "France", countryCode: "FR" },
    "LYS": { code: "LYS", city: "Lyon", country: "France", countryCode: "FR" },
    "MRS": { code: "MRS", city: "Marseille", country: "France", countryCode: "FR" },

    // Germany
    "FRA": { code: "FRA", city: "Frankfurt", country: "Germany", countryCode: "DE" },
    "MUC": { code: "MUC", city: "Munich", country: "Germany", countryCode: "DE" },
    "DUS": { code: "DUS", city: "Dusseldorf", country: "Germany", countryCode: "DE" },
    "TXL": { code: "TXL", city: "Berlin", country: "Germany", countryCode: "DE" },
    "BER": { code: "BER", city: "Berlin", country: "Germany", countryCode: "DE" },
    "HAM": { code: "HAM", city: "Hamburg", country: "Germany", countryCode: "DE" },

    // Spain
    "MAD": { code: "MAD", city: "Madrid", country: "Spain", countryCode: "ES" },
    "BCN": { code: "BCN", city: "Barcelona", country: "Spain", countryCode: "ES" },
    "PMI": { code: "PMI", city: "Palma de Mallorca", country: "Spain", countryCode: "ES" },
    "AGP": { code: "AGP", city: "Malaga", country: "Spain", countryCode: "ES" },

    // Italy
    "FCO": { code: "FCO", city: "Rome", country: "Italy", countryCode: "IT" },
    "MXP": { code: "MXP", city: "Milan", country: "Italy", countryCode: "IT" },
    "VCE": { code: "VCE", city: "Venice", country: "Italy", countryCode: "IT" },
    "NAP": { code: "NAP", city: "Naples", country: "Italy", countryCode: "IT" },
    "FLR": { code: "FLR", city: "Florence", country: "Italy", countryCode: "IT" },

    // Netherlands
    "AMS": { code: "AMS", city: "Amsterdam", country: "Netherlands", countryCode: "NL" },

    // Belgium
    "BRU": { code: "BRU", city: "Brussels", country: "Belgium", countryCode: "BE" },

    // Switzerland
    "ZRH": { code: "ZRH", city: "Zurich", country: "Switzerland", countryCode: "CH" },
    "GVA": { code: "GVA", city: "Geneva", country: "Switzerland", countryCode: "CH" },

    // Austria
    "VIE": { code: "VIE", city: "Vienna", country: "Austria", countryCode: "AT" },

    // Portugal
    "LIS": { code: "LIS", city: "Lisbon", country: "Portugal", countryCode: "PT" },
    "OPO": { code: "OPO", city: "Porto", country: "Portugal", countryCode: "PT" },

    // Ireland
    "DUB": { code: "DUB", city: "Dublin", country: "Ireland", countryCode: "IE" },

    // Scandinavia
    "CPH": { code: "CPH", city: "Copenhagen", country: "Denmark", countryCode: "DK" },
    "ARN": { code: "ARN", city: "Stockholm", country: "Sweden", countryCode: "SE" },
    "OSL": { code: "OSL", city: "Oslo", country: "Norway", countryCode: "NO" },
    "HEL": { code: "HEL", city: "Helsinki", country: "Finland", countryCode: "FI" },

    // Eastern Europe
    "PRG": { code: "PRG", city: "Prague", country: "Czech Republic", countryCode: "CZ" },
    "WAW": { code: "WAW", city: "Warsaw", country: "Poland", countryCode: "PL" },
    "BUD": { code: "BUD", city: "Budapest", country: "Hungary", countryCode: "HU" },

    // Greece
    "ATH": { code: "ATH", city: "Athens", country: "Greece", countryCode: "GR" },

    // Turkey
    "IST": { code: "IST", city: "Istanbul", country: "Turkey", countryCode: "TR" },

    // Middle East
    "DXB": { code: "DXB", city: "Dubai", country: "United Arab Emirates", countryCode: "AE" },
    "AUH": { code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE" },
    "DOH": { code: "DOH", city: "Doha", country: "Qatar", countryCode: "QA" },
    "TLV": { code: "TLV", city: "Tel Aviv", country: "Israel", countryCode: "IL" },

    // Asia
    "HND": { code: "HND", city: "Tokyo", country: "Japan", countryCode: "JP" },
    "NRT": { code: "NRT", city: "Tokyo", country: "Japan", countryCode: "JP" },
    "KIX": { code: "KIX", city: "Osaka", country: "Japan", countryCode: "JP" },
    "ICN": { code: "ICN", city: "Seoul", country: "South Korea", countryCode: "KR" },
    "PEK": { code: "PEK", city: "Beijing", country: "China", countryCode: "CN" },
    "PVG": { code: "PVG", city: "Shanghai", country: "China", countryCode: "CN" },
    "HKG": { code: "HKG", city: "Hong Kong", country: "Hong Kong", countryCode: "HK" },
    "TPE": { code: "TPE", city: "Taipei", country: "Taiwan", countryCode: "TW" },
    "SIN": { code: "SIN", city: "Singapore", country: "Singapore", countryCode: "SG" },
    "BKK": { code: "BKK", city: "Bangkok", country: "Thailand", countryCode: "TH" },
    "KUL": { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY" },
    "CGK": { code: "CGK", city: "Jakarta", country: "Indonesia", countryCode: "ID" },
    "DPS": { code: "DPS", city: "Bali", country: "Indonesia", countryCode: "ID" },
    "MNL": { code: "MNL", city: "Manila", country: "Philippines", countryCode: "PH" },
    "DEL": { code: "DEL", city: "New Delhi", country: "India", countryCode: "IN" },
    "BOM": { code: "BOM", city: "Mumbai", country: "India", countryCode: "IN" },

    // Oceania
    "SYD": { code: "SYD", city: "Sydney", country: "Australia", countryCode: "AU" },
    "MEL": { code: "MEL", city: "Melbourne", country: "Australia", countryCode: "AU" },
    "BNE": { code: "BNE", city: "Brisbane", country: "Australia", countryCode: "AU" },
    "PER": { code: "PER", city: "Perth", country: "Australia", countryCode: "AU" },
    "AKL": { code: "AKL", city: "Auckland", country: "New Zealand", countryCode: "NZ" },

    // South America
    "GRU": { code: "GRU", city: "Sao Paulo", country: "Brazil", countryCode: "BR" },
    "GIG": { code: "GIG", city: "Rio de Janeiro", country: "Brazil", countryCode: "BR" },
    "EZE": { code: "EZE", city: "Buenos Aires", country: "Argentina", countryCode: "AR" },
    "SCL": { code: "SCL", city: "Santiago", country: "Chile", countryCode: "CL" },
    "LIM": { code: "LIM", city: "Lima", country: "Peru", countryCode: "PE" },
    "BOG": { code: "BOG", city: "Bogota", country: "Colombia", countryCode: "CO" },

    // Caribbean
    "SJU": { code: "SJU", city: "San Juan", country: "Puerto Rico", countryCode: "PR" },
    "MBJ": { code: "MBJ", city: "Montego Bay", country: "Jamaica", countryCode: "JM" },
    "NAS": { code: "NAS", city: "Nassau", country: "Bahamas", countryCode: "BS" },
    "PUJ": { code: "PUJ", city: "Punta Cana", country: "Dominican Republic", countryCode: "DO" },

    // Africa
    "JNB": { code: "JNB", city: "Johannesburg", country: "South Africa", countryCode: "ZA" },
    "CPT": { code: "CPT", city: "Cape Town", country: "South Africa", countryCode: "ZA" },
    "CAI": { code: "CAI", city: "Cairo", country: "Egypt", countryCode: "EG" },
    "CMN": { code: "CMN", city: "Casablanca", country: "Morocco", countryCode: "MA" },
    "NBO": { code: "NBO", city: "Nairobi", country: "Kenya", countryCode: "KE" },
};

// Airport name aliases - maps common names/variations to airport codes
const airportNameAliases: Record<string, string> = {
    // Germany
    "munich international": "MUC",
    "munich airport": "MUC",
    "franz josef strauss": "MUC",
    "frankfurt international": "FRA",
    "frankfurt airport": "FRA",
    "berlin brandenburg": "BER",
    "hamburg airport": "HAM",
    "dusseldorf airport": "DUS",

    // Portugal
    "lisbon airport": "LIS",
    "humberto delgado": "LIS",
    "portela airport": "LIS",
    "porto airport": "OPO",

    // UK
    "heathrow": "LHR",
    "london heathrow": "LHR",
    "gatwick": "LGW",
    "london gatwick": "LGW",
    "stansted": "STN",
    "london stansted": "STN",
    "manchester airport": "MAN",
    "edinburgh airport": "EDI",
    "glasgow airport": "GLA",

    // France
    "charles de gaulle": "CDG",
    "paris cdg": "CDG",
    "orly": "ORY",
    "paris orly": "ORY",
    "nice airport": "NCE",

    // Spain
    "madrid barajas": "MAD",
    "barajas": "MAD",
    "barcelona el prat": "BCN",
    "el prat": "BCN",

    // Italy
    "fiumicino": "FCO",
    "rome fiumicino": "FCO",
    "leonardo da vinci": "FCO",
    "milan malpensa": "MXP",
    "malpensa": "MXP",
    "marco polo": "VCE",
    "venice marco polo": "VCE",

    // Netherlands
    "schiphol": "AMS",
    "amsterdam schiphol": "AMS",

    // Switzerland
    "zurich airport": "ZRH",
    "geneva airport": "GVA",

    // USA
    "jfk": "JFK",
    "john f kennedy": "JFK",
    "los angeles international": "LAX",
    "lax": "LAX",
    "o'hare": "ORD",
    "chicago o'hare": "ORD",
    "hartsfield jackson": "ATL",
    "atlanta international": "ATL",
    "san francisco international": "SFO",
    "sfo": "SFO",
    "miami international": "MIA",
    "fort lauderdale hollywood": "FLL",
    "seattle tacoma": "SEA",
    "denver international": "DEN",
    "mccarran": "LAS",
    "harry reid": "LAS",
    "las vegas international": "LAS",
    "orlando international": "MCO",
    "newark liberty": "EWR",
    "logan": "BOS",
    "boston logan": "BOS",

    // Canada
    "pearson": "YYZ",
    "toronto pearson": "YYZ",
    "vancouver international": "YVR",

    // Middle East
    "dubai international": "DXB",
    "abu dhabi international": "AUH",
    "hamad international": "DOH",
    "ben gurion": "TLV",

    // Asia
    "narita": "NRT",
    "tokyo narita": "NRT",
    "haneda": "HND",
    "tokyo haneda": "HND",
    "changi": "SIN",
    "singapore changi": "SIN",
    "hong kong international": "HKG",
    "incheon": "ICN",
    "seoul incheon": "ICN",
    "suvarnabhumi": "BKK",
    "bangkok suvarnabhumi": "BKK",

    // Oceania
    "kingsford smith": "SYD",
    "sydney international": "SYD",
    "tullamarine": "MEL",
    "melbourne airport": "MEL",
    "auckland international": "AKL",
};

/**
 * Look up airport information by code
 */
export function getAirportInfo(code: string): AirportInfo | null {
    const upperCode = code.toUpperCase().trim();
    return airportData[upperCode] || null;
}

/**
 * Find airport code by name (fuzzy matching)
 */
export function findAirportByName(name: string): string | null {
    const normalized = name.toLowerCase().trim();

    // Direct lookup in aliases
    if (airportNameAliases[normalized]) {
        return airportNameAliases[normalized];
    }

    // Partial match - check if any alias is contained in the name
    for (const [alias, code] of Object.entries(airportNameAliases)) {
        if (normalized.includes(alias) || alias.includes(normalized)) {
            return code;
        }
    }

    // Also check city names in the airport data
    for (const [code, info] of Object.entries(airportData)) {
        if (normalized.includes(info.city.toLowerCase())) {
            return code;
        }
    }

    return null;
}

/**
 * Check if two airport codes are in the same country
 */
export function isSameCountry(code1: string, code2: string): boolean {
    const airport1 = getAirportInfo(code1);
    const airport2 = getAirportInfo(code2);

    if (!airport1 || !airport2) return false;
    return airport1.countryCode === airport2.countryCode;
}

/**
 * Extract airport codes from text (looks for both codes and names)
 */
export function extractAirportCodes(text: string): string[] {
    const foundCodes: string[] = [];
    const upperText = text.toUpperCase();
    const lowerText = text.toLowerCase();

    // First, look for 3-letter airport codes
    const codePattern = /\b([A-Z]{3})\b/g;
    const codeMatches = upperText.match(codePattern) || [];
    for (const code of codeMatches) {
        if (airportData[code] && !foundCodes.includes(code)) {
            foundCodes.push(code);
        }
    }

    // If we found enough codes, return them
    if (foundCodes.length >= 2) {
        return foundCodes;
    }

    // Otherwise, look for airport names
    // Common patterns: "From: AIRPORT NAME" or "To: AIRPORT NAME"
    const fromMatch = lowerText.match(/from[:\s]+([a-z\s]+?)(?:\n|\d|$)/i);
    const toMatch = lowerText.match(/to[:\s]+([a-z\s]+?)(?:\n|\d|$)/i);

    if (fromMatch) {
        const code = findAirportByName(fromMatch[1].trim());
        if (code && !foundCodes.includes(code)) {
            foundCodes.unshift(code); // Add at beginning (departure)
        }
    }

    if (toMatch) {
        const code = findAirportByName(toMatch[1].trim());
        if (code && !foundCodes.includes(code)) {
            foundCodes.push(code); // Add at end (arrival)
        }
    }

    // Also try to find any airport name in the text
    if (foundCodes.length < 2) {
        for (const [alias, code] of Object.entries(airportNameAliases)) {
            if (lowerText.includes(alias) && !foundCodes.includes(code)) {
                foundCodes.push(code);
            }
        }
    }

    return foundCodes;
}

