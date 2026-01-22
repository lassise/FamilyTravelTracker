import { getAirportQuality, AIRLINES, type Airline } from "./airportsData";
import type { FlightPreferences } from "@/hooks/useFlightPreferences";
export type { FlightPreferences };

export interface FlightSegment {
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  duration: string | number; // Can be ISO 8601 string or minutes as number
  stops: number;
  aircraft?: string;
  cabin?: string;
  airplane?: string;
  legroom?: string;
  extensions?: string[];
}

export interface FlightItinerary {
  type?: 'outbound' | 'return' | string;
  segments: FlightSegment[];
}

export interface LayoverInfo {
  airport?: string;
  airportName?: string;
  duration: number;
  overnight?: boolean;
}

export interface FlightResult {
  id: string;
  price: number;
  currency: string;
  itineraries: FlightItinerary[];
  departureAirport?: string;
  isAlternateOrigin?: boolean;
  minSavingsRequired?: number;
  layovers?: LayoverInfo[];
}

export interface PreferenceMatch {
  type: "positive" | "negative";
  label: string;
  detail?: string;
}

export interface PriceInsight {
  level: "low" | "medium" | "high";
  label: string;
  advice: string;
}

export interface MatchExplanation {
  whyNotPerfect: string[];
  whyBestChoice: string[];
}

export interface ScoredFlight extends FlightResult {
  score: number;
  breakdown: ScoreBreakdown;
  badges: string[];
  explanation: string;
  warnings: string[];
  familyStressScore?: number;
  delayRisk: "low" | "medium" | "high";
  hiddenCosts: HiddenCost[];
  preferenceMatches: PreferenceMatch[];
  bookingUrl?: string;
  savingsFromPrimary?: number;
  pricePerTicket?: number;
  savingsPerTicket?: number;
  passengers?: number;
  priceInsight?: PriceInsight;
  matchExplanation?: MatchExplanation;
  isAvoidedAirline?: boolean;
  isPreferredAirline?: boolean;
  scorePenalty?: number;
  scoreBoost?: number;
}

export interface ScoreBreakdown {
  nonstop: number;
  travelTime: number;
  layoverQuality: number;
  departureTime: number;
  arrivalTime: number;
  airlineReliability: number;
  price: number;
  amenities: number;
  total: number;
}

export interface HiddenCost {
  type: string;
  description: string;
  estimatedCost: number;
}

// Weights for scoring (sum to 100)
const WEIGHTS = {
  nonstop: 22,
  travelTime: 18,
  layoverQuality: 8,
  departureTime: 10,
  arrivalTime: 5,
  airlineReliability: 14,
  price: 15,
  amenities: 8, // New amenities weight
};

// Amenity scoring constants
const AMENITY_MUST_HAVE_PENALTY = 25; // Heavy penalty for missing must-have amenity
const AMENITY_NICE_TO_HAVE_BOOST = 10; // Boost for having nice-to-have amenity

// Airline preference constants
const AVOIDED_AIRLINE_PENALTY = 50; // Massive penalty applied to total score for avoided airlines
const PREFERRED_AIRLINE_BOOST = 15; // Boost applied to total score for preferred airlines
const HIGH_PRICE_PENALTY = 5; // Penalty for flights identified as higher price

// Airline alias map for common variations (e.g., "JetBlue" -> "JetBlue Airways", "B6")
const AIRLINE_ALIASES: Record<string, string[]> = {
  "jetblue": ["B6", "jetblue", "jetblue airways", "jet blue"],
  "spirit": ["NK", "spirit", "spirit airlines"],
  "frontier": ["F9", "frontier", "frontier airlines"],
  "american": ["AA", "american", "american airlines"],
  "delta": ["DL", "delta", "delta air lines"],
  "united": ["UA", "united", "united airlines"],
  "southwest": ["WN", "southwest", "southwest airlines"],
  "alaska": ["AS", "alaska", "alaska airlines"],
};

/**
 * Canonical airline normalization function
 * Returns normalized code and name for consistent matching
 */
interface NormalizedAirline {
  codeNormalized: string | null; // Uppercase IATA code (e.g., "B6", "NK")
  nameNormalized: string | null; // Lowercase trimmed name (e.g., "jetblue", "spirit")
  airline: Airline | null; // Full airline object if found
}

const normalizeAirline = (airlineInput: string | null | undefined): NormalizedAirline => {
  if (!airlineInput) {
    return { codeNormalized: null, nameNormalized: null, airline: null };
  }

  const input = airlineInput.trim();
  const inputUpper = input.toUpperCase();
  const inputLower = input.toLowerCase();

  // Try to find airline by code first (most reliable)
  let airline = AIRLINES.find(a => {
    const codeMatch = inputUpper === a.code || inputUpper.startsWith(a.code);
    const nameMatch = inputLower === a.name.toLowerCase() || 
                     a.name.toLowerCase().includes(inputLower) ||
                     inputLower.includes(a.name.toLowerCase());
    return codeMatch || nameMatch;
  });

  // If not found, try alias matching
  if (!airline) {
    for (const [canonical, aliases] of Object.entries(AIRLINE_ALIASES)) {
      if (aliases.some(alias => {
        const aliasUpper = alias.toUpperCase();
        const aliasLower = alias.toLowerCase();
        return inputUpper === aliasUpper || 
               inputUpper.startsWith(aliasUpper) ||
               inputLower === aliasLower ||
               inputLower.includes(aliasLower) ||
               aliasLower.includes(inputLower);
      })) {
        // Find airline by canonical name
        airline = AIRLINES.find(a => a.name.toLowerCase().includes(canonical));
        break;
      }
    }
  }

  // Extract code from input if it looks like a flight number (e.g., "B61707" -> "B6")
  let codeNormalized: string | null = null;
  if (input.length >= 2) {
    const potentialCode = input.substring(0, 2).toUpperCase();
    if (AIRLINES.some(a => a.code === potentialCode)) {
      codeNormalized = potentialCode;
    } else if (airline) {
      codeNormalized = airline.code;
    }
  } else if (airline) {
    codeNormalized = airline.code;
  }

  const nameNormalized = airline ? airline.name.toLowerCase().trim() : null;

  return {
    codeNormalized,
    nameNormalized,
    airline: airline || null,
  };
};

/**
 * Check if an airline matches a preference list (preferred or avoided)
 * Uses canonical normalization for robust matching
 * 
 * Matches if ANY of these conditions are true:
 * - Preference contains the airline code and flight has that code
 * - Preference contains the airline name (or alias) and flight has that name
 * - Preference code matches flight code (e.g., "B6" matches "B61707")
 * - Preference name matches flight name (case-insensitive, partial match)
 */
const matchesAirlinePreference = (
  airlineInput: string | null | undefined,
  preferenceList: string[]
): boolean => {
  if (!airlineInput || preferenceList.length === 0) return false;

  const normalized = normalizeAirline(airlineInput);
  if (!normalized.codeNormalized && !normalized.nameNormalized) return false;
  
  // Check each preference in the list
  for (const pref of preferenceList) {
    const prefTrimmed = (pref || "").trim();
    if (!prefTrimmed) continue;
    
    const prefUpper = prefTrimmed.toUpperCase();
    const prefLower = prefTrimmed.toLowerCase();
    
    // 1. Direct code match (e.g., preference "B6" matches flight "B6" or "B61707")
    if (normalized.codeNormalized) {
      if (prefUpper === normalized.codeNormalized || 
          prefUpper.startsWith(normalized.codeNormalized) ||
          normalized.codeNormalized.startsWith(prefUpper)) {
        return true;
      }
    }
    
    // 2. Direct name match (case-insensitive)
    if (normalized.nameNormalized) {
      if (prefLower === normalized.nameNormalized ||
          normalized.nameNormalized.includes(prefLower) ||
          prefLower.includes(normalized.nameNormalized)) {
        return true;
      }
    }
    
    // 3. Alias matching - check if preference is an alias for the airline
    for (const [canonical, aliases] of Object.entries(AIRLINE_ALIASES)) {
      // Check if preference matches any alias
      const prefMatchesAlias = aliases.some(alias => {
        const aliasUpper = alias.toUpperCase();
        const aliasLower = alias.toLowerCase();
        return prefUpper === aliasUpper || 
               prefUpper.startsWith(aliasUpper) ||
               prefLower === aliasLower ||
               prefLower.includes(aliasLower) ||
               aliasLower.includes(prefLower);
      });
      
      // If preference matches alias, check if airline matches canonical
      if (prefMatchesAlias) {
        if (normalized.nameNormalized?.includes(canonical) ||
            normalized.codeNormalized === aliases[0]?.toUpperCase()) {
          return true;
        }
      }
    }
    
    // 4. Normalize preference and check against airline
    const prefNormalized = normalizeAirline(prefTrimmed);
    if (prefNormalized.codeNormalized && normalized.codeNormalized) {
      if (prefNormalized.codeNormalized === normalized.codeNormalized) {
        return true;
      }
    }
    if (prefNormalized.nameNormalized && normalized.nameNormalized) {
      if (prefNormalized.nameNormalized === normalized.nameNormalized ||
          prefNormalized.nameNormalized.includes(normalized.nameNormalized) ||
          normalized.nameNormalized.includes(prefNormalized.nameNormalized)) {
        return true;
      }
    }
  }

  return false;
};

// Parse duration - can be ISO 8601 string "PT5H30M" or number (minutes)
const parseDuration = (duration: string | number | undefined | null): number => {
  if (duration === null || duration === undefined) return 0;
  if (typeof duration === 'number') return duration;
  if (typeof duration !== 'string') return 0;
  const hours = duration.match(/(\d+)H/)?.[1] || 0;
  const minutes = duration.match(/(\d+)M/)?.[1] || 0;
  return parseInt(String(hours)) * 60 + parseInt(String(minutes));
};

// Get hour from datetime string
const getHour = (dateTime: string): number => {
  if (!dateTime) return 12;
  return new Date(dateTime).getHours();
};

// Score departure time based on preferences
const scoreDepartureTime = (hour: number, preferences: FlightPreferences): number => {
  const timeSlots = preferences.preferred_departure_times;
  if (timeSlots.length === 0) return 70; // Neutral if no preference

  const isEarlyMorning = hour >= 5 && hour < 8;
  const isMorning = hour >= 8 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 21;
  const isRedEye = hour >= 21 || hour < 5;

  let score = 50;
  if (timeSlots.includes("early_morning") && isEarlyMorning) score = 100;
  else if (timeSlots.includes("morning") && isMorning) score = 100;
  else if (timeSlots.includes("afternoon") && isAfternoon) score = 100;
  else if (timeSlots.includes("evening") && isEvening) score = 100;
  else if (timeSlots.includes("red_eye") && isRedEye) score = 100;

  // Penalize red-eye if not allowed
  if (isRedEye && !preferences.red_eye_allowed) {
    score = 10;
  }

  return score;
};

// Check if an airline is in the avoided list (by code or name)
// Uses canonical normalization for robust matching
const isAvoidedAirline = (airlineCode: string, preferences: FlightPreferences): boolean => {
  if (!airlineCode || preferences.avoided_airlines.length === 0) return false;
  return matchesAirlinePreference(airlineCode, preferences.avoided_airlines);
};

// Score airline reliability - returns score and flags for preference boosts/penalties
// Uses canonical normalization for robust matching
const scoreAirlineReliability = (airlineCode: string, preferences: FlightPreferences): {
  score: number;
  isAvoided: boolean;
  isPreferred: boolean;
} => {
  const normalized = normalizeAirline(airlineCode);
  const airline = normalized.airline;
  let score = airline?.reliability || 70;
  let isAvoided = false;
  let isPreferred = false;

  // Check for preferred airlines using canonical matching
  if (preferences.preferred_airlines.length > 0) {
    isPreferred = matchesAirlinePreference(airlineCode, preferences.preferred_airlines);
    if (isPreferred) {
      score = Math.min(100, score + 20); // Boost for preferred airlines
    }
  }

  // Check for avoided airlines using canonical matching
  if (preferences.avoided_airlines.length > 0) {
    isAvoided = matchesAirlinePreference(airlineCode, preferences.avoided_airlines);
    if (isAvoided) {
      score = 0; // Zero out the reliability score for avoided airlines
    }
  }

  // Bonus for preferred alliances
  if (airline?.alliance && preferences.preferred_alliances.includes(airline.alliance)) {
    score = Math.min(100, score + 10);
  }

  return { score, isAvoided, isPreferred };
};

// Calculate family stress score (lower is better for families)
const calculateFamilyStressScore = (flight: FlightResult, preferences: FlightPreferences): number => {
  let stress = 0;

  for (const itinerary of flight.itineraries) {
    // Multiple segments mean connections
    if (itinerary.segments.length > 1) {
      for (let i = 0; i < itinerary.segments.length - 1; i++) {
        const arrival = new Date(itinerary.segments[i].arrivalTime);
        const nextDeparture = new Date(itinerary.segments[i + 1].departureTime);
        const connectionMinutes = (nextDeparture.getTime() - arrival.getTime()) / (1000 * 60);

        // Tight connections are stressful
        if (connectionMinutes < preferences.family_min_connection_minutes) {
          stress += 30;
        } else if (connectionMinutes < 90) {
          stress += 15;
        }

        // Check connection airport quality
        const connectionAirport = itinerary.segments[i].arrivalAirport;
        const quality = getAirportQuality(connectionAirport);
        if (quality.score < 70) {
          stress += 15;
        }
      }
    }

    // Early morning departures are stressful with kids
    const departureHour = getHour(itinerary.segments[0]?.departureTime);
    if (departureHour < 7) {
      stress += 20;
    }

    // Late arrivals mean tired kids
    const arrivalHour = getHour(itinerary.segments[itinerary.segments.length - 1]?.arrivalTime);
    if (arrivalHour > 22) {
      stress += 15;
    }
  }

  return Math.min(100, stress);
};

// Detect hidden costs
const detectHiddenCosts = (flight: FlightResult, preferences: FlightPreferences): HiddenCost[] => {
  const costs: HiddenCost[] = [];

  for (const itinerary of flight.itineraries) {
    for (const segment of itinerary.segments) {
      const airlineCode = segment.airline;

      // Spirit/Frontier basic economy warnings
      if (["NK", "F9"].includes(airlineCode)) {
        if (!preferences.carry_on_only) {
          costs.push({
            type: "baggage",
            description: "Carry-on bag fee (not included in base fare)",
            estimatedCost: 45,
          });
        }
        costs.push({
          type: "seat",
          description: "Seat selection fee",
          estimatedCost: 25,
        });
      }

      // Basic economy seat selection - check if user has seat preference
      const seatPrefs = preferences.seat_preference || [];
      const wantsSpecificSeat = seatPrefs.length > 0 && !seatPrefs.includes("middle");
      if (["AA", "UA", "DL"].includes(airlineCode) && wantsSpecificSeat) {
        const seatType = seatPrefs.includes("window") ? "Window" : seatPrefs.includes("aisle") ? "Aisle" : "Preferred";
        costs.push({
          type: "seat",
          description: `${seatType} seat may require fee on basic economy`,
          estimatedCost: 35,
        });
      }

      // Car seat window requirement
      if (preferences.needs_window_for_car_seat) {
        costs.push({
          type: "requirement",
          description: "Window seat required for car seat - verify availability",
          estimatedCost: 0,
        });
      }
    }
  }

  // Checked bag fees
  if (preferences.default_checked_bags > 0) {
    costs.push({
      type: "baggage",
      description: `${preferences.default_checked_bags} checked bag(s)`,
      estimatedCost: preferences.default_checked_bags * 35,
    });
  }

  return costs;
};

// Estimate delay risk based on route and time
const estimateDelayRisk = (flight: FlightResult): "low" | "medium" | "high" => {
  let riskScore = 0;

  for (const itinerary of flight.itineraries) {
    for (const segment of itinerary.segments) {
      // Known problematic airports for delays
      if (["EWR", "LGA", "JFK", "ORD", "SFO"].includes(segment.departureAirport)) {
        riskScore += 15;
      }
      if (["EWR", "LGA", "JFK", "ORD", "SFO"].includes(segment.arrivalAirport)) {
        riskScore += 10;
      }

      // Afternoon departures often have more delays
      const hour = getHour(segment.departureTime);
      if (hour >= 14 && hour <= 19) {
        riskScore += 10;
      }

      // Airlines with lower reliability
      const airline = AIRLINES.find(a => segment.airline.startsWith(a.code));
      if (airline && airline.reliability < 75) {
        riskScore += 15;
      }
    }

    // Connections increase delay risk
    if (itinerary.segments.length > 1) {
      riskScore += 20;
    }
  }

  if (riskScore >= 40) return "high";
  if (riskScore >= 20) return "medium";
  return "low";
};

// Detect amenities from flight extensions
interface FlightAmenities {
  hasSeatbackEntertainment: boolean;
  hasMobileEntertainment: boolean;
  hasUsbCharging: boolean;
  hasPowerOutlet: boolean;
  legroom: string | null;
  legroomInches: number | null;
}

const detectAmenities = (flight: FlightResult): FlightAmenities => {
  const amenities: FlightAmenities = {
    hasSeatbackEntertainment: false,
    hasMobileEntertainment: false,
    hasUsbCharging: false,
    hasPowerOutlet: false,
    legroom: null,
    legroomInches: null,
  };

  for (const itinerary of flight.itineraries) {
    for (const segment of itinerary.segments) {
      const extensions = segment.extensions || [];
      const extLower = extensions.map((e: string) => e?.toLowerCase() || '');
      
      // Check for seatback entertainment
      if (extLower.some(e => 
        e.includes('personal device') || 
        e.includes('seatback') || 
        e.includes('in-seat') ||
        e.includes('on-demand') ||
        e.includes('entertainment')
      )) {
        amenities.hasSeatbackEntertainment = true;
      }
      
      // Check for mobile/streaming entertainment
      if (extLower.some(e => 
        e.includes('stream') || 
        e.includes('wi-fi') || 
        e.includes('wifi')
      )) {
        amenities.hasMobileEntertainment = true;
      }
      
      // Check for USB/power
      if (extLower.some(e => 
        e.includes('usb') || 
        e.includes('power outlet') ||
        e.includes('in-seat power')
      )) {
        amenities.hasUsbCharging = true;
        amenities.hasPowerOutlet = true;
      }
      
      // Check legroom
      if (segment.legroom) {
        amenities.legroom = segment.legroom;
        // Try to parse legroom inches (e.g., "32 in" or "32")
        const match = segment.legroom.match(/(\d+)/);
        if (match) {
          amenities.legroomInches = parseInt(match[1], 10);
        }
      }
    }
  }

  return amenities;
};

// Score amenities based on user preferences
const scoreAmenities = (amenities: FlightAmenities, preferences: FlightPreferences): {
  score: number;
  matches: { type: 'positive' | 'negative'; label: string; detail?: string }[];
} => {
  let score = 70; // Base score
  const matches: { type: 'positive' | 'negative'; label: string; detail?: string }[] = [];

  // Seatback Entertainment
  if (preferences.entertainment_seatback === 'must_have') {
    if (!amenities.hasSeatbackEntertainment) {
      score -= AMENITY_MUST_HAVE_PENALTY;
      matches.push({ type: 'negative', label: 'No seatback screen', detail: 'Must-have not available' });
    } else {
      score += AMENITY_NICE_TO_HAVE_BOOST;
      matches.push({ type: 'positive', label: 'Seatback entertainment', detail: 'Has your required feature' });
    }
  } else if (preferences.entertainment_seatback === 'nice_to_have' && amenities.hasSeatbackEntertainment) {
    score += AMENITY_NICE_TO_HAVE_BOOST;
    matches.push({ type: 'positive', label: 'Seatback entertainment' });
  }

  // Mobile Entertainment
  if (preferences.entertainment_mobile === 'must_have') {
    if (!amenities.hasMobileEntertainment) {
      score -= AMENITY_MUST_HAVE_PENALTY;
      matches.push({ type: 'negative', label: 'No streaming', detail: 'Must-have not available' });
    } else {
      score += AMENITY_NICE_TO_HAVE_BOOST;
      matches.push({ type: 'positive', label: 'Streaming available', detail: 'Has your required feature' });
    }
  } else if (preferences.entertainment_mobile === 'nice_to_have' && amenities.hasMobileEntertainment) {
    score += AMENITY_NICE_TO_HAVE_BOOST;
    matches.push({ type: 'positive', label: 'WiFi streaming' });
  }

  // USB Charging
  if (preferences.usb_charging === 'must_have') {
    if (!amenities.hasUsbCharging) {
      score -= AMENITY_MUST_HAVE_PENALTY;
      matches.push({ type: 'negative', label: 'No USB/power', detail: 'Must-have not available' });
    } else {
      score += AMENITY_NICE_TO_HAVE_BOOST;
      matches.push({ type: 'positive', label: 'USB charging', detail: 'Has your required feature' });
    }
  } else if (preferences.usb_charging === 'nice_to_have' && amenities.hasUsbCharging) {
    score += AMENITY_NICE_TO_HAVE_BOOST;
    matches.push({ type: 'positive', label: 'Power outlets' });
  }

  // Legroom
  if (preferences.legroom_preference === 'must_have' || preferences.legroom_preference === 'nice_to_have') {
    const avgLegroom = 31; // Average economy legroom
    const minRequired = preferences.min_legroom_inches || (avgLegroom + 2);
    
    if (amenities.legroomInches !== null) {
      if (amenities.legroomInches >= minRequired) {
        score += preferences.legroom_preference === 'must_have' ? AMENITY_NICE_TO_HAVE_BOOST * 1.5 : AMENITY_NICE_TO_HAVE_BOOST;
        matches.push({ type: 'positive', label: `${amenities.legroomInches}" legroom`, detail: 'Above average space' });
      } else if (preferences.legroom_preference === 'must_have') {
        score -= AMENITY_MUST_HAVE_PENALTY;
        matches.push({ type: 'negative', label: `${amenities.legroomInches}" legroom`, detail: `Below your ${minRequired}" requirement` });
      }
    }
  }

  return { score: Math.max(0, Math.min(100, score)), matches };
};

// Ranking category for flight quality
export type FlightRanking = "best" | "good_alternative" | "acceptable" | "not_recommended";

// Generate explanation for why this flight was scored this way
const generateExplanation = (
  flight: ScoredFlight, 
  preferences: FlightPreferences,
  ranking: FlightRanking,
  rankIndex: number
): string => {
  const reasons: string[] = [];

  const firstSegment = flight.itineraries[0]?.segments[0];
  const isNonstop = flight.itineraries.every(it => it.segments.length === 1);

  if (isNonstop) {
    reasons.push("non-stop flight");
  }

  // Add preferred airline to reasons
  if (flight.isPreferredAirline) {
    reasons.push("preferred airline");
  }

  if (flight.breakdown.departureTime > 80) {
    reasons.push("preferred departure time");
  }

  if (flight.breakdown.travelTime > 80) {
    reasons.push("short travel time");
  }

  if (flight.delayRisk === "low") {
    reasons.push("low delay risk");
  }

  // Different verbiage based on ranking
  // All flights are numbered sequentially: #1, #2, #3, etc.
  const flightNumber = rankIndex + 1;
  
  if (ranking === "best") {
    if (reasons.length === 0) {
      return `🏆 Top pick (#${flightNumber}): Best balance of your preferences`;
    }
    return `🏆 Top pick (#${flightNumber}): ${reasons.join(", ")}`;
  } else if (ranking === "good_alternative") {
    const positives = reasons.slice(0, 2);
    if (positives.length === 0) {
      return `✓ Good alternative (#${flightNumber}): Solid option worth considering`;
    }
    return `✓ Good alternative (#${flightNumber}): ${positives.join(", ")}`;
  } else if (ranking === "acceptable") {
    if (reasons.length === 0) {
      return `Option #${flightNumber}: Meets basic requirements`;
    }
    return `Option #${flightNumber}: ${reasons.slice(0, 2).join(", ")}`;
  } else {
    // not_recommended
    const negatives: string[] = [];
    if (flight.breakdown.price < 50) negatives.push("expensive");
    if (flight.breakdown.travelTime < 50) negatives.push("long travel time");
    if (!isNonstop && preferences.prefer_nonstop) negatives.push("has stops");
    if (flight.delayRisk === "high") negatives.push("high delay risk");
    if (flight.breakdown.airlineReliability < 60) negatives.push("less reliable airline");
    
    if (negatives.length === 0) {
      return `⚠️ Not recommended: Doesn't match your preferences well`;
    }
    return `⚠️ Not recommended: ${negatives.slice(0, 2).join(", ")}`;
  }
};

// Generate match explanation for non-perfect scores
const generateMatchExplanation = (flight: ScoredFlight, preferences: FlightPreferences): MatchExplanation => {
  const whyNotPerfect: string[] = [];
  const whyBestChoice: string[] = [];
  
  const negativeMatches = flight.preferenceMatches.filter(m => m.type === "negative");
  const positiveMatches = flight.preferenceMatches.filter(m => m.type === "positive");
  
  // Why not perfect - based on negative preference matches
  for (const match of negativeMatches) {
    if (match.label.includes("stops") || match.label === "Has stops") {
      whyNotPerfect.push("Has connecting flights instead of nonstop");
    } else if (match.label.includes("Red-eye")) {
      whyNotPerfect.push("Departure time is outside your preferred hours");
    } else if (match.label.includes("layover") || match.label.includes("connection")) {
      whyNotPerfect.push(match.detail || "Layover timing doesn't match preferences");
    } else if (match.label.includes("Carry-on") || match.label.includes("Bag")) {
      whyNotPerfect.push("Extra baggage fees may apply");
    } else if (match.detail?.includes("avoid")) {
      whyNotPerfect.push(`Flying on ${match.label} which you prefer to avoid`);
    } else if (match.label.includes("stress")) {
      whyNotPerfect.push("May be stressful for family travel");
    } else if (match.label.includes("airport") || match.label.includes("Limited")) {
      whyNotPerfect.push("Connection airport has limited amenities");
    }
  }
  
  // Add score-based reasons
  if (flight.breakdown.price < 70) {
    whyNotPerfect.push("Not the most affordable option");
  }
  if (flight.breakdown.travelTime < 60) {
    whyNotPerfect.push("Longer total travel time");
  }
  if (flight.breakdown.departureTime < 70 && !whyNotPerfect.some(r => r.includes("Departure"))) {
    whyNotPerfect.push("Departure time is not your preferred slot");
  }
  
  // Why it's still the best choice
  for (const match of positiveMatches) {
    if (match.label.includes("Non-stop")) {
      whyBestChoice.push("Direct flight saves you time and hassle");
    } else if (match.label.includes("Preferred departure")) {
      whyBestChoice.push("Departs at your preferred time");
    } else if (match.label.includes("reliable") || match.label.includes("Reliable")) {
      whyBestChoice.push("High airline reliability means fewer delays");
    } else if (match.label.includes("Short travel")) {
      whyBestChoice.push("Gets you there faster than alternatives");
    } else if (match.label.includes("price") || match.label.includes("Price")) {
      whyBestChoice.push("Great value for money");
    } else if (match.label.includes("WiFi")) {
      whyBestChoice.push("In-flight WiFi available");
    } else if (match.label.includes("Family")) {
      whyBestChoice.push("Family-friendly timing and connections");
    } else if (match.detail?.includes("preferred airline") || match.detail === "Your preferred airline") {
      // Check both the detail text and also check if the label is an airline name
      const airlineName = match.label;
      whyBestChoice.push(`Flying on ${airlineName}, your preferred airline`);
    }
  }
  
  // Also check if isPreferredAirline flag is set (fallback if not in preferenceMatches)
  if (flight.isPreferredAirline && !whyBestChoice.some(r => r.includes("preferred airline"))) {
    const airline = AIRLINES.find(a => {
      const firstSegment = flight.itineraries[0]?.segments[0];
      const airlineCode = firstSegment?.airline || "";
      return airlineCode.startsWith(a.code) || airlineCode === a.name;
    });
    const airlineName = airline?.name || flight.itineraries[0]?.segments[0]?.airline || "this airline";
    whyBestChoice.push(`Flying on ${airlineName}, your preferred airline`);
  }
  
  // Add breakdown-based positives
  if (flight.breakdown.price >= 85 && !whyBestChoice.some(r => r.includes("value"))) {
    whyBestChoice.push("One of the most affordable options");
  }
  if (flight.breakdown.travelTime >= 85 && !whyBestChoice.some(r => r.includes("faster"))) {
    whyBestChoice.push("Minimal total travel time");
  }
  if (flight.delayRisk === "low" && !whyBestChoice.some(r => r.includes("delay"))) {
    whyBestChoice.push("Low risk of delays");
  }
  if (flight.breakdown.layoverQuality >= 85) {
    whyBestChoice.push("Well-connected hub airports if stopping");
  }
  
  return {
    whyNotPerfect: whyNotPerfect.slice(0, 3), // Limit to top 3
    whyBestChoice: whyBestChoice.slice(0, 3),
  };
};

// Calculate price insight based on price distribution
// Helper to format date nicely
const formatDateShort = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Get next Tuesday from a given date
const getNextTuesday = (from: Date): Date => {
  const result = new Date(from);
  const day = result.getDay();
  const daysUntilTuesday = (2 - day + 7) % 7 || 7; // If already Tuesday, get next week's
  result.setDate(result.getDate() + daysUntilTuesday);
  return result;
};

// Check if route is likely international based on airport codes
const isLikelyInternational = (departureAirport: string, arrivalAirport: string): boolean => {
  // US airport codes generally are 3 letters starting with specific patterns
  const usPatterns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W'];
  const isOriginUS = usPatterns.some(p => departureAirport.startsWith(p)) && departureAirport.length === 3;
  const isDestUS = usPatterns.some(p => arrivalAirport.startsWith(p)) && arrivalAirport.length === 3;
  // Simple heuristic - if both look like US codes, assume domestic
  return !(isOriginUS && isDestUS);
};

const calculatePriceInsight = (
  price: number, 
  allPrices: number[], 
  departureDate?: string,
  departureAirport?: string,
  arrivalAirport?: string
): PriceInsight => {
  const today = new Date();
  const depDate = departureDate ? new Date(departureDate) : null;
  const daysUntilDeparture = depDate ? Math.ceil((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isInternational = departureAirport && arrivalAirport ? isLikelyInternational(departureAirport, arrivalAirport) : false;
  
  if (allPrices.length < 2) {
    return {
      level: "medium",
      label: "Average price",
      advice: "Prices vary. Set a price alert to get notified when prices drop.",
    };
  }
  
  const sorted = [...allPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  
  // Determine percentile position
  const percentile = range > 0 ? ((price - min) / range) * 100 : 50;
  
  if (percentile <= 25) {
    let advice = "This is a good deal – book soon before prices rise.";
    if (daysUntilDeparture !== null) {
      if (daysUntilDeparture <= 7) {
        advice = "Great price for last-minute travel! Book now – prices rarely drop this close to departure.";
      } else if (daysUntilDeparture <= 21) {
        advice = "Excellent price for your travel date. Book soon – prices typically climb in the final 3 weeks.";
      }
    }
    return {
      level: "low",
      label: "Great price",
      advice,
    };
  } else if (percentile <= 60) {
    let advice = "Average pricing.";
    
    if (daysUntilDeparture !== null && depDate) {
      if (isInternational) {
        // International: best 2-3 months out
        const idealBookingStart = new Date(depDate);
        idealBookingStart.setDate(idealBookingStart.getDate() - 90); // 3 months
        const idealBookingEnd = new Date(depDate);
        idealBookingEnd.setDate(idealBookingEnd.getDate() - 60); // 2 months
        
        if (daysUntilDeparture > 90) {
          advice = `Fair price. The sweet spot for international flights is typically ${formatDateShort(idealBookingStart)} to ${formatDateShort(idealBookingEnd)} (2-3 months before departure).`;
        } else if (daysUntilDeparture >= 60) {
          advice = "You're in the ideal booking window for international flights. Consider setting a price alert if you want to wait for a better deal.";
        } else {
          advice = "Prices often rise closer to departure for international flights. This is a reasonable price to lock in.";
        }
      } else {
        // Domestic: best 3-6 weeks out
        const idealBookingStart = new Date(depDate);
        idealBookingStart.setDate(idealBookingStart.getDate() - 42); // 6 weeks
        const idealBookingEnd = new Date(depDate);
        idealBookingEnd.setDate(idealBookingEnd.getDate() - 21); // 3 weeks
        
        if (daysUntilDeparture > 42) {
          advice = `Fair price. The sweet spot for domestic flights is typically ${formatDateShort(idealBookingStart)} to ${formatDateShort(idealBookingEnd)} (3-6 weeks before departure).`;
        } else if (daysUntilDeparture >= 21) {
          advice = "You're in the ideal booking window for domestic flights. Consider setting a price alert if you want to wait for a better deal.";
        } else {
          advice = "Prices typically rise in the final 3 weeks. This is a reasonable price to lock in.";
        }
      }
    } else {
      advice = "Average pricing. Best to book 3-6 weeks before domestic or 2-3 months before international flights.";
    }
    
    return {
      level: "medium", 
      label: "Fair price",
      advice,
    };
  } else {
    // High price - suggest checking back
    let advice = "Consider waiting if your dates are flexible.";
    
    if (depDate && daysUntilDeparture !== null) {
      const nextTuesday = getNextTuesday(today);
      const tuesdayAfter = new Date(nextTuesday);
      tuesdayAfter.setDate(tuesdayAfter.getDate() + 7);
      
      if (daysUntilDeparture <= 14) {
        advice = `Prices are high this close to departure. If flexible, check again on ${formatDateShort(nextTuesday)} – airlines often release deals on Tuesdays.`;
      } else if (daysUntilDeparture <= 30) {
        advice = `Higher than average. Check back on ${formatDateShort(nextTuesday)} or ${formatDateShort(tuesdayAfter)} – prices often drop on Tuesdays. Set a price alert to get notified.`;
      } else {
        // Calculate ideal booking window
        const idealStart = new Date(depDate);
        idealStart.setDate(idealStart.getDate() - (isInternational ? 90 : 42));
        const idealEnd = new Date(depDate);
        idealEnd.setDate(idealEnd.getDate() - (isInternational ? 60 : 21));
        
        if (today < idealStart) {
          advice = `Prices are high now. The best time to book is ${formatDateShort(idealStart)} to ${formatDateShort(idealEnd)}. Set a price alert to track drops.`;
        } else {
          advice = `Higher than average. Check back on ${formatDateShort(nextTuesday)} – airlines often release deals on Tuesdays. Set a price alert to get notified.`;
        }
      }
    } else {
      advice = "Consider waiting if your dates are flexible. Prices often drop on Tuesdays or during sales. Set a price alert to track this route.";
    }
    
    return {
      level: "high",
      label: "Higher price",
      advice,
    };
  }
};

export interface PassengerBreakdown {
  adults: number;
  children: number; // Ages 2-11
  infantsInSeat: number;
  infantsOnLap: number;
}

// Build a proper Google Flights booking URL with full passenger breakdown
const buildGoogleFlightsUrl = (
  departureAirport: string,
  arrivalAirport: string,
  departureDate: string,
  returnDate?: string,
  passengerBreakdown?: PassengerBreakdown,
  cabinClass: string = "economy"
): string => {
  const adults = passengerBreakdown?.adults || 1;
  const children = passengerBreakdown?.children || 0;
  const infantsInSeat = passengerBreakdown?.infantsInSeat || 0;
  const infantsOnLap = passengerBreakdown?.infantsOnLap || 0;
  
  // Cabin class mapping for Google Flights
  const cabinMap: Record<string, string> = {
    economy: "economy",
    premium_economy: "premium+economy",
    business: "business",
    first: "first",
  };
  
  const cabin = cabinMap[cabinClass] || "economy";
  
  // Build passenger string parts
  const passengerParts: string[] = [];
  if (adults > 0) passengerParts.push(`${adults}%20adult${adults > 1 ? 's' : ''}`);
  if (children > 0) passengerParts.push(`${children}%20child${children > 1 ? 'ren' : ''}`);
  if (infantsInSeat > 0) passengerParts.push(`${infantsInSeat}%20infant${infantsInSeat > 1 ? 's' : ''}%20in%20seat`);
  if (infantsOnLap > 0) passengerParts.push(`${infantsOnLap}%20infant${infantsOnLap > 1 ? 's' : ''}%20on%20lap`);
  
  const passengerString = passengerParts.length > 0 ? `%20${passengerParts.join('%20')}` : '';
  
  // Build the query - format that Google Flights understands
  // Example: flights from JFK to LAX on 2024-03-15 return 2024-03-22 2 adults 1 child business class
  let query = `flights%20from%20${departureAirport}%20to%20${arrivalAirport}%20on%20${departureDate}`;
  if (returnDate) {
    query += `%20return%20${returnDate}`;
  }
  query += passengerString;
  if (cabin !== "economy") {
    query += `%20${cabin}%20class`;
  }
  
  return `https://www.google.com/travel/flights/search?q=${query}&curr=USD`;
};

// Main scoring function - optimized
export const scoreFlights = (
  flights: FlightResult[],
  preferences: FlightPreferences,
  allFlightPrices?: number[],
  passengerBreakdown?: PassengerBreakdown,
  cabinClass: string = "economy"
): ScoredFlight[] => {
  if (!flights || flights.length === 0) return [];
  
  const totalPassengers = passengerBreakdown 
    ? passengerBreakdown.adults + passengerBreakdown.children + passengerBreakdown.infantsInSeat + passengerBreakdown.infantsOnLap
    : 1;

  // Pre-calculate price range
  const prices = allFlightPrices || flights.map(f => f.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Pre-calculate travel times and range
  const travelTimes: number[] = new Array(flights.length);
  for (let i = 0; i < flights.length; i++) {
    let total = 0;
    for (const it of flights[i].itineraries) {
      for (const seg of it.segments) {
        total += parseDuration(seg.duration);
      }
    }
    travelTimes[i] = total;
  }
  
  const minTime = Math.min(...travelTimes);
  const maxTime = Math.max(...travelTimes);
  const timeRange = maxTime - minTime || 1;

  // Cache airline lookups
  const airlineCache = new Map<string, ReturnType<typeof AIRLINES.find>>();
  const getAirlineCached = (code: string) => {
    if (!airlineCache.has(code)) {
      airlineCache.set(code, AIRLINES.find(a => code.startsWith(a.code) || code === a.name));
    }
    return airlineCache.get(code);
  };

  const scoredFlights: ScoredFlight[] = new Array(flights.length);

  for (let index = 0; index < flights.length; index++) {
    const flight = flights[index];
    const breakdown: ScoreBreakdown = {
      nonstop: 0,
      travelTime: 0,
      layoverQuality: 0,
      departureTime: 0,
      arrivalTime: 0,
      airlineReliability: 0,
      price: 0,
      amenities: 0,
      total: 0,
    };

    // Score nonstop
    const isNonstop = flight.itineraries.every(it => it.segments.length === 1);
    const hasOneStop = flight.itineraries.every(it => it.segments.length <= 2);
    breakdown.nonstop = isNonstop ? 100 : hasOneStop ? 60 : 30;

    if (preferences.prefer_nonstop && !isNonstop) {
      breakdown.nonstop = Math.max(0, breakdown.nonstop - 30);
    }

    // Score travel time (normalized)
    breakdown.travelTime = 100 - ((travelTimes[index] - minTime) / timeRange) * 100;

    // Score layover quality
    let layoverScore = 100;
    for (const it of flight.itineraries) {
      if (it.segments.length > 1) {
        for (let i = 0; i < it.segments.length - 1; i++) {
          const quality = getAirportQuality(it.segments[i].arrivalAirport);
          layoverScore = Math.min(layoverScore, quality.score);
        }
      }
    }
    breakdown.layoverQuality = layoverScore;

    // Score departure time
    const firstSegment = flight.itineraries[0]?.segments[0];
    breakdown.departureTime = scoreDepartureTime(getHour(firstSegment?.departureTime), preferences);

    // Score arrival time
    const lastItinerary = flight.itineraries[0];
    const lastSegment = lastItinerary?.segments[lastItinerary.segments.length - 1];
    const arrivalHour = getHour(lastSegment?.arrivalTime);
    breakdown.arrivalTime = arrivalHour >= 22 ? 50 : arrivalHour <= 6 ? 60 : 85;

    // Score airline reliability
    const airlineResult = scoreAirlineReliability(firstSegment?.airline || "", preferences);
    breakdown.airlineReliability = airlineResult.score;
    const isAvoidedAirlineFlight = airlineResult.isAvoided;
    const isPreferredAirlineFlight = airlineResult.isPreferred;

    // Score price (normalized)
    breakdown.price = 100 - ((flight.price - minPrice) / priceRange) * 100;

    // Score amenities (with Must Have penalty / Nice to Have boost)
    const flightAmenities = detectAmenities(flight);
    const amenityResult = scoreAmenities(flightAmenities, preferences);
    breakdown.amenities = amenityResult.score;

    // Calculate weighted total
    let weightedTotal = Math.round(
      (breakdown.nonstop * WEIGHTS.nonstop +
        breakdown.travelTime * WEIGHTS.travelTime +
        breakdown.layoverQuality * WEIGHTS.layoverQuality +
        breakdown.departureTime * WEIGHTS.departureTime +
        breakdown.arrivalTime * WEIGHTS.arrivalTime +
        breakdown.airlineReliability * WEIGHTS.airlineReliability +
        breakdown.price * WEIGHTS.price +
        breakdown.amenities * WEIGHTS.amenities) / 100
    );

    // Apply massive penalty for avoided airlines - they should be at the bottom
    if (isAvoidedAirlineFlight) {
      weightedTotal = Math.max(0, weightedTotal - AVOIDED_AIRLINE_PENALTY);
    }

    // Apply boost for preferred airlines
    if (isPreferredAirlineFlight) {
      weightedTotal = Math.min(100, weightedTotal + PREFERRED_AIRLINE_BOOST);
    }

    // Calculate priceInsight early to apply penalty if needed
    const departureAirport = firstSegment?.departureAirport || "";
    const arrivalAirport = lastSegment?.arrivalAirport || "";
    const departureDateStr = firstSegment?.departureTime ? new Date(firstSegment.departureTime).toISOString().split('T')[0] : "";
    const priceInsight = calculatePriceInsight(flight.price, prices, departureDateStr, departureAirport, arrivalAirport);

    // Apply penalty for higher price flights
    if (priceInsight.level === "high") {
      weightedTotal = Math.max(0, weightedTotal - HIGH_PRICE_PENALTY);
    }

    breakdown.total = weightedTotal;

    // Assign badges
    const badges: string[] = [];
    if (isNonstop) badges.push("Nonstop");
    if (breakdown.price === 100) badges.push("Cheapest");
    if (breakdown.travelTime > 90) badges.push("Fastest");
    if (breakdown.airlineReliability > 85) badges.push("Reliable");

    // Warnings
    const warnings: string[] = [];
    const depHour = getHour(firstSegment?.departureTime);
    if (!preferences.red_eye_allowed && (depHour >= 21 || depHour < 5)) {
      warnings.push("Red-eye flight (you prefer to avoid these)");
    }

    // Generate preference matches
    const preferenceMatches: PreferenceMatch[] = [];
    
    // Positive matches
    if (isNonstop && preferences.prefer_nonstop) {
      preferenceMatches.push({ type: "positive", label: "Non-stop", detail: "Matches your preference" });
    } else if (isNonstop) {
      preferenceMatches.push({ type: "positive", label: "Non-stop flight" });
    }
    
    if (breakdown.departureTime > 80) {
      preferenceMatches.push({ type: "positive", label: "Preferred departure time" });
    }
    
    const airlineCode = firstSegment?.airline || "";
    // Check preferred airlines using canonical matching
    if (airlineCode && preferences.preferred_airlines.length > 0) {
      const isPreferred = matchesAirlinePreference(airlineCode, preferences.preferred_airlines);
      if (isPreferred) {
        const normalized = normalizeAirline(airlineCode);
        const airlineName = normalized.airline?.name || normalized.codeNormalized || airlineCode;
        preferenceMatches.push({ type: "positive", label: airlineName, detail: "Your preferred airline" });
      }
    }
    
    if (breakdown.airlineReliability > 85) {
      preferenceMatches.push({ type: "positive", label: "Highly reliable", detail: `${breakdown.airlineReliability}% reliability` });
    }
    
    if (travelTimes[index] <= minTime + 30) {
      preferenceMatches.push({ type: "positive", label: "Short travel time" });
    }
    
    if (breakdown.price > 90) {
      preferenceMatches.push({ type: "positive", label: "Great price", detail: "Among the cheapest" });
    }

    // Check for wifi (legacy - kept for compatibility but amenity scoring handles this better)
    let hasWifi = false;
    for (const it of flight.itineraries) {
      for (const seg of it.segments) {
        if (seg.extensions?.some((ext: string) => ext?.toLowerCase().includes('wi-fi') || ext?.toLowerCase().includes('wifi'))) {
          hasWifi = true;
          break;
        }
      }
      if (hasWifi) break;
    }
    if (hasWifi && preferences.entertainment_mobile === 'none') {
      // Only show generic WiFi badge if user hasn't set specific preferences
      preferenceMatches.push({ type: "positive", label: "Has WiFi" });
    }
    
    // Add amenity preference matches from scoring
    for (const match of amenityResult.matches) {
      preferenceMatches.push(match);
    }
    
    // Negative matches
    if (!isNonstop && preferences.prefer_nonstop) {
      preferenceMatches.push({ type: "negative", label: "Has stops", detail: "You prefer non-stop" });
    }
    
    if ((depHour >= 21 || depHour < 5) && !preferences.red_eye_allowed) {
      preferenceMatches.push({ type: "negative", label: "Red-eye flight", detail: "You prefer to avoid" });
    }
    
    // Check avoided airlines using canonical matching
    if (airlineCode && preferences.avoided_airlines.length > 0) {
      const isAvoided = matchesAirlinePreference(airlineCode, preferences.avoided_airlines);
      if (isAvoided) {
        const normalized = normalizeAirline(airlineCode);
        const airlineName = normalized.airline?.name || normalized.codeNormalized || airlineCode;
        preferenceMatches.push({ type: "negative", label: airlineName, detail: "Airline you avoid" });
      }
    }
    
    if (breakdown.layoverQuality < 60) {
      preferenceMatches.push({ type: "negative", label: "Limited airport", detail: "Connection airport has fewer amenities" });
    }

    // Check for long layovers
    outer: for (const it of flight.itineraries) {
      if (it.segments.length > 1) {
        for (let i = 0; i < it.segments.length - 1; i++) {
          const arrival = new Date(it.segments[i].arrivalTime);
          const nextDeparture = new Date(it.segments[i + 1].departureTime);
          const connectionMinutes = (nextDeparture.getTime() - arrival.getTime()) / (1000 * 60);
          
          if (connectionMinutes > preferences.max_layover_hours * 60) {
            preferenceMatches.push({ type: "negative", label: "Long layover", detail: `${Math.round(connectionMinutes / 60)}h layover exceeds your ${preferences.max_layover_hours}h max` });
            break outer;
          } else if (connectionMinutes <= 75) {
            preferenceMatches.push({ type: "negative", label: "Tight connection", detail: `${connectionMinutes}min layover is tight` });
            break outer;
          }
        }
      }
    }

    // Budget airline warnings
    const firstAirline = firstSegment?.airline || "";
    if (firstAirline === "NK" || firstAirline === "F9") {
      preferenceMatches.push({ type: "negative", label: "Carry-on fee", detail: "Carry-on bags cost extra" });
      if (!preferences.carry_on_only) {
        preferenceMatches.push({ type: "negative", label: "Bag fees extra", detail: "Ultra low-cost carrier" });
      }
    }
    
    let familyStressScore: number | undefined;
    if (preferences.family_mode) {
      familyStressScore = calculateFamilyStressScore(flight, preferences);
      if (familyStressScore > 50) {
        preferenceMatches.push({ type: "negative", label: "High family stress", detail: "Tight connections or late arrivals" });
      } else if (familyStressScore < 20) {
        preferenceMatches.push({ type: "positive", label: "Family-friendly", detail: "Good timing and connections" });
      }
    }

    // Build booking URL (reuse variables calculated above)
    const returnSegment = flight.itineraries[1]?.segments[0];
    const returnDateStr = returnSegment?.departureTime ? new Date(returnSegment.departureTime).toISOString().split('T')[0] : "";
    
    const bookingUrl = departureAirport && arrivalAirport && departureDateStr
      ? buildGoogleFlightsUrl(departureAirport, arrivalAirport, departureDateStr, returnDateStr, passengerBreakdown, cabinClass)
      : undefined;

    const pricePerTicket = totalPassengers > 0 ? flight.price / totalPassengers : flight.price;
    // priceInsight already calculated above for penalty application

    const scoredFlight: ScoredFlight = {
      ...flight,
      score: breakdown.total,
      breakdown,
      badges,
      explanation: "",
      warnings,
      familyStressScore,
      delayRisk: estimateDelayRisk(flight),
      hiddenCosts: detectHiddenCosts(flight, preferences),
      preferenceMatches,
      bookingUrl,
      pricePerTicket,
      passengers: totalPassengers,
      priceInsight,
      isAvoidedAirline: isAvoidedAirlineFlight,
      isPreferredAirline: isPreferredAirlineFlight,
      scorePenalty: isAvoidedAirlineFlight ? AVOIDED_AIRLINE_PENALTY : undefined,
      scoreBoost: isPreferredAirlineFlight ? PREFERRED_AIRLINE_BOOST : undefined,
    };

    // Explanation will be set after sorting
    scoredFlight.explanation = "";
    
    if (breakdown.total < 100) {
      scoredFlight.matchExplanation = generateMatchExplanation(scoredFlight, preferences);
    }

    scoredFlights[index] = scoredFlight;
  }

  // Sort by FINAL score descending, but put avoided airlines at the bottom regardless of score
  // CRITICAL: The sorted array is the source of truth for display order and numbering
  scoredFlights.sort((a, b) => {
    // Avoided airlines always go to the bottom (unless ALL flights are avoided)
    if (a.isAvoidedAirline && !b.isAvoidedAirline) return 1;
    if (!a.isAvoidedAirline && b.isAvoidedAirline) return -1;
    // Within same category (both avoided or both not avoided), sort by FINAL score descending
    return b.score - a.score;
  });
  
  // Now assign rankings and explanations based on FINAL sorted order
  // Separate non-avoided flights for "best" ranking determination
  const nonAvoidedFlights = scoredFlights.filter(f => !f.isAvoidedAirline);
  const topScore = nonAvoidedFlights.length > 0 ? nonAvoidedFlights[0].score : (scoredFlights[0]?.score || 0);
  
  // Track rank index separately for non-avoided flights (starts at 0 for #1)
  let nonAvoidedRankIndex = 0;
  
  for (let i = 0; i < scoredFlights.length; i++) {
    const flight = scoredFlights[i];
    const scoreDiff = topScore - flight.score;
    
    let ranking: FlightRanking;
    let rankIndex: number;
    
    // CRITICAL: Avoided airlines CANNOT be #1 if any non-avoided option exists
    if (flight.isAvoidedAirline) {
      ranking = "not_recommended";
      // Avoided airlines are numbered after all non-avoided flights
      // Count how many avoided airlines come before this one
      const avoidedBeforeThis = scoredFlights.slice(0, i).filter(f => f.isAvoidedAirline).length;
      rankIndex = nonAvoidedFlights.length + avoidedBeforeThis;
    } else {
      // For non-avoided flights, use sequential numbering starting from 0 (#1, #2, etc.)
      rankIndex = nonAvoidedRankIndex;
      nonAvoidedRankIndex++;
      
      // Determine ranking category based on position and score
      if (rankIndex === 0) {
        // First non-avoided flight is always "best" (#1)
        ranking = "best";
      } else if (scoreDiff <= 10) {
        ranking = "good_alternative";
      } else if (scoreDiff <= 25 || flight.score >= 60) {
        ranking = "acceptable";
      } else {
        ranking = "not_recommended";
      }
    }
    
    // Generate explanation with correct rank index (will be displayed as rankIndex + 1)
    flight.explanation = generateExplanation(flight, preferences, ranking, rankIndex);
  }
  
  return scoredFlights;
};

// Get categorized results - optimized with single pass where possible
export const categorizeFlights = (scoredFlights: ScoredFlight[]): {
  bestOverall: ScoredFlight | null;
  fastest: ScoredFlight | null;
  cheapest: ScoredFlight | null;
  bestForFamilies: ScoredFlight | null;
} => {
  if (scoredFlights.length === 0) {
    return { bestOverall: null, fastest: null, cheapest: null, bestForFamilies: null };
  }

  // Filter out avoided airlines for "best" categories, but include them for fastest/cheapest
  // (since user might want to see cheapest even if avoided)
  const nonAvoidedFlights = scoredFlights.filter(f => !f.isAvoidedAirline);
  const flightsForBest = nonAvoidedFlights.length > 0 ? nonAvoidedFlights : scoredFlights;

  let fastest = flightsForBest[0];
  let cheapest = scoredFlights[0]; // Cheapest can be avoided (user might want to see it)
  let bestForFamilies = flightsForBest[0];

  for (let i = 1; i < scoredFlights.length; i++) {
    const f = scoredFlights[i];
    if (f.price < cheapest.price) cheapest = f;
  }

  for (let i = 1; i < flightsForBest.length; i++) {
    const f = flightsForBest[i];
    if (f.breakdown.travelTime > fastest.breakdown.travelTime) fastest = f;
    if ((f.familyStressScore || 100) < (bestForFamilies.familyStressScore || 100)) bestForFamilies = f;
  }

  return { 
    bestOverall: flightsForBest[0] || null, 
    fastest, 
    cheapest, 
    bestForFamilies 
  };
};
