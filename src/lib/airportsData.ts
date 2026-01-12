// Airport data with IATA codes
export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat?: number;
  lon?: number;
}

// Major US airports - commonly used
export const US_AIRPORTS: Airport[] = [
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "US" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "US" },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "US" },
  { code: "DEN", name: "Denver International", city: "Denver", country: "US" },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "US" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "US" },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "US" },
  { code: "LAS", name: "Harry Reid International", city: "Las Vegas", country: "US" },
  { code: "MCO", name: "Orlando International", city: "Orlando", country: "US" },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "US" },
  { code: "MIA", name: "Miami International", city: "Miami", country: "US" },
  { code: "PHX", name: "Phoenix Sky Harbor International", city: "Phoenix", country: "US" },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "US" },
  { code: "BOS", name: "Boston Logan International", city: "Boston", country: "US" },
  { code: "MSP", name: "Minneapolis-St. Paul International", city: "Minneapolis", country: "US" },
  { code: "FLL", name: "Fort Lauderdale-Hollywood International", city: "Fort Lauderdale", country: "US" },
  { code: "DTW", name: "Detroit Metropolitan Wayne County", city: "Detroit", country: "US" },
  { code: "PHL", name: "Philadelphia International", city: "Philadelphia", country: "US" },
  { code: "LGA", name: "LaGuardia", city: "New York", country: "US" },
  { code: "BWI", name: "Baltimore/Washington International", city: "Baltimore", country: "US" },
  { code: "SLC", name: "Salt Lake City International", city: "Salt Lake City", country: "US" },
  { code: "DCA", name: "Ronald Reagan Washington National", city: "Washington", country: "US" },
  { code: "IAD", name: "Washington Dulles International", city: "Washington", country: "US" },
  { code: "SAN", name: "San Diego International", city: "San Diego", country: "US" },
  { code: "TPA", name: "Tampa International", city: "Tampa", country: "US" },
  { code: "PDX", name: "Portland International", city: "Portland", country: "US" },
  { code: "AUS", name: "Austin-Bergstrom International", city: "Austin", country: "US" },
  { code: "BNA", name: "Nashville International", city: "Nashville", country: "US" },
  { code: "HNL", name: "Daniel K. Inouye International", city: "Honolulu", country: "US" },
  { code: "STL", name: "St. Louis Lambert International", city: "St. Louis", country: "US" },
  { code: "RDU", name: "Raleigh-Durham International", city: "Raleigh", country: "US" },
  { code: "MCI", name: "Kansas City International", city: "Kansas City", country: "US" },
  { code: "CLE", name: "Cleveland Hopkins International", city: "Cleveland", country: "US" },
  { code: "SMF", name: "Sacramento International", city: "Sacramento", country: "US" },
  { code: "SJC", name: "San Jose Mineta International", city: "San Jose", country: "US" },
  { code: "OAK", name: "Oakland International", city: "Oakland", country: "US" },
  { code: "PBI", name: "Palm Beach International", city: "West Palm Beach", country: "US" },
  { code: "RSW", name: "Southwest Florida International", city: "Fort Myers", country: "US" },
  { code: "SNA", name: "John Wayne Airport", city: "Santa Ana", country: "US" },
  { code: "MSY", name: "Louis Armstrong New Orleans International", city: "New Orleans", country: "US" },
];

// International major airports
export const INTERNATIONAL_AIRPORTS: Airport[] = [
  { code: "LHR", name: "Heathrow", city: "London", country: "GB" },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "AE" },
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "HK" },
  { code: "NRT", name: "Narita International", city: "Tokyo", country: "JP" },
  { code: "HND", name: "Haneda", city: "Tokyo", country: "JP" },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "SG" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "DE" },
  { code: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL" },
  { code: "ICN", name: "Incheon International", city: "Seoul", country: "KR" },
  { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "ES" },
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madrid", country: "ES" },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "IT" },
  { code: "MUC", name: "Munich Airport", city: "Munich", country: "DE" },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "CH" },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "AU" },
  { code: "MEX", name: "Mexico City International", city: "Mexico City", country: "MX" },
  { code: "CUN", name: "Cancún International", city: "Cancún", country: "MX" },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "CA" },
  { code: "YVR", name: "Vancouver International", city: "Vancouver", country: "CA" },
];

export const ALL_AIRPORTS: Airport[] = [...US_AIRPORTS, ...INTERNATIONAL_AIRPORTS];

// Airline data
export interface Airline {
  code: string;
  name: string;
  alliance?: string;
  reliability: number; // 0-100 score
}

export const AIRLINES: Airline[] = [
  { code: "AA", name: "American Airlines", alliance: "Oneworld", reliability: 78 },
  { code: "DL", name: "Delta Air Lines", alliance: "SkyTeam", reliability: 85 },
  { code: "UA", name: "United Airlines", alliance: "Star Alliance", reliability: 80 },
  { code: "WN", name: "Southwest Airlines", reliability: 82 },
  { code: "B6", name: "JetBlue Airways", reliability: 75 },
  { code: "AS", name: "Alaska Airlines", alliance: "Oneworld", reliability: 83 },
  { code: "NK", name: "Spirit Airlines", reliability: 65 },
  { code: "F9", name: "Frontier Airlines", reliability: 68 },
  { code: "HA", name: "Hawaiian Airlines", reliability: 80 },
  { code: "BA", name: "British Airways", alliance: "Oneworld", reliability: 82 },
  { code: "AF", name: "Air France", alliance: "SkyTeam", reliability: 79 },
  { code: "LH", name: "Lufthansa", alliance: "Star Alliance", reliability: 84 },
  { code: "EK", name: "Emirates", reliability: 88 },
  { code: "SQ", name: "Singapore Airlines", alliance: "Star Alliance", reliability: 91 },
  { code: "QR", name: "Qatar Airways", alliance: "Oneworld", reliability: 87 },
];

export const ALLIANCES = ["Star Alliance", "Oneworld", "SkyTeam"];

// Search airports by code, name, or city
export const searchAirports = (query: string): Airport[] => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return ALL_AIRPORTS.filter(
    a => 
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
  ).slice(0, 10);
};

// Get nearby airports (simplified - in production you'd use real distance calculations)
export const getNearbyAirports = (code: string): Airport[] => {
  const nearbyMap: Record<string, string[]> = {
    "PBI": ["FLL", "MIA"],
    "FLL": ["PBI", "MIA"],
    "MIA": ["PBI", "FLL"],
    "JFK": ["LGA", "EWR"],
    "LGA": ["JFK", "EWR"],
    "EWR": ["JFK", "LGA"],
    "SFO": ["OAK", "SJC"],
    "OAK": ["SFO", "SJC"],
    "SJC": ["SFO", "OAK"],
    "LAX": ["SNA", "BUR", "LGB"],
    "DCA": ["IAD", "BWI"],
    "IAD": ["DCA", "BWI"],
    "BWI": ["DCA", "IAD"],
  };
  
  const nearbyCodes = nearbyMap[code] || [];
  return ALL_AIRPORTS.filter(a => nearbyCodes.includes(a.code));
};

// Airport quality ratings for layovers
export const AIRPORT_QUALITY: Record<string, { score: number; notes: string }> = {
  "SIN": { score: 95, notes: "World's best airport - excellent facilities, transit hotel" },
  "ICN": { score: 92, notes: "Excellent amenities, free city tours for long layovers" },
  "HND": { score: 90, notes: "Modern, efficient, great food options" },
  "DXB": { score: 88, notes: "Massive duty-free, lounges, sleeping pods" },
  "AMS": { score: 85, notes: "Compact, easy connections, museum" },
  "DEN": { score: 82, notes: "Modern, good food court, natural light" },
  "ATL": { score: 75, notes: "Large but efficient, plane train between terminals" },
  "ORD": { score: 68, notes: "Large, can be congested, allow extra connection time" },
  "LAX": { score: 65, notes: "Under renovation, terminal changes require planning" },
  "JFK": { score: 70, notes: "Varies by terminal, international connections improved" },
  "MIA": { score: 72, notes: "Improved recently, can be confusing for first-timers" },
  "EWR": { score: 60, notes: "Avoid tight connections, construction ongoing" },
  "LGA": { score: 58, notes: "Small, delays common, limited amenities" },
  "PHL": { score: 62, notes: "Older terminals, allow buffer time" },
};

export const getAirportQuality = (code: string): { score: number; notes: string } => {
  return AIRPORT_QUALITY[code] || { score: 70, notes: "Standard airport" };
};
