import { getAirportQuality, AIRLINES } from "./airportsData";
import type { FlightPreferences } from "@/hooks/useFlightPreferences";

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
  segments: FlightSegment[];
}

export interface FlightResult {
  id: string;
  price: number;
  currency: string;
  itineraries: FlightItinerary[];
  departureAirport?: string;
  isAlternateOrigin?: boolean;
  minSavingsRequired?: number;
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
}

export interface ScoreBreakdown {
  nonstop: number;
  travelTime: number;
  layoverQuality: number;
  departureTime: number;
  arrivalTime: number;
  airlineReliability: number;
  price: number;
  total: number;
}

export interface HiddenCost {
  type: string;
  description: string;
  estimatedCost: number;
}

// Weights for scoring (sum to 100)
const WEIGHTS = {
  nonstop: 25,
  travelTime: 20,
  layoverQuality: 10,
  departureTime: 10,
  arrivalTime: 5,
  airlineReliability: 15,
  price: 15,
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
const isAvoidedAirline = (airlineCode: string, preferences: FlightPreferences): boolean => {
  const airline = AIRLINES.find(a => airlineCode.startsWith(a.code) || airlineCode === a.name);
  if (!airline) return false;
  
  // Check if the airline name OR code is in the avoided list
  return preferences.avoided_airlines.includes(airline.name) || 
         preferences.avoided_airlines.includes(airline.code);
};

// Score airline reliability
const scoreAirlineReliability = (airlineCode: string, preferences: FlightPreferences): number => {
  const airline = AIRLINES.find(a => airlineCode.startsWith(a.code) || airlineCode === a.name);
  let score = airline?.reliability || 70;

  // Bonus for preferred airlines
  if (airline && preferences.preferred_airlines.includes(airline.name)) {
    score = Math.min(100, score + 15);
  }

  // Heavy penalty for avoided airlines - make it very significant
  if (airline && (preferences.avoided_airlines.includes(airline.name) || preferences.avoided_airlines.includes(airline.code))) {
    score = 0; // Zero out the score for avoided airlines
  }

  // Bonus for preferred alliances
  if (airline?.alliance && preferences.preferred_alliances.includes(airline.alliance)) {
    score = Math.min(100, score + 10);
  }

  return score;
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

// Generate explanation for why this flight was scored this way
const generateExplanation = (flight: ScoredFlight, preferences: FlightPreferences): string => {
  const reasons: string[] = [];

  const firstSegment = flight.itineraries[0]?.segments[0];
  const isNonstop = flight.itineraries.every(it => it.segments.length === 1);

  if (isNonstop) {
    reasons.push("non-stop flight");
  }

  if (flight.breakdown.airlineReliability > 80) {
    reasons.push("reliable airline");
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

  if (reasons.length === 0) {
    return "Balanced option considering your preferences";
  }

  return `Great pick: ${reasons.join(", ")}`;
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
    } else if (match.detail?.includes("preferred airline")) {
      whyBestChoice.push(`Flying on ${match.label}, your preferred airline`);
    }
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
const calculatePriceInsight = (price: number, allPrices: number[]): PriceInsight => {
  if (allPrices.length < 2) {
    return {
      level: "medium",
      label: "Average price",
      advice: "Prices vary. Check back for potential drops.",
    };
  }
  
  const sorted = [...allPrices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  
  // Determine percentile position
  const percentile = range > 0 ? ((price - min) / range) * 100 : 50;
  
  if (percentile <= 25) {
    return {
      level: "low",
      label: "Great price",
      advice: "This is a good deal. Book soon – prices can rise as departure approaches.",
    };
  } else if (percentile <= 60) {
    return {
      level: "medium", 
      label: "Fair price",
      advice: "Average pricing. Best to book 3-6 weeks before domestic or 2-3 months before international flights.",
    };
  } else {
    return {
      level: "high",
      label: "Higher price",
      advice: "Consider waiting if your dates are flexible. Prices often drop on Tuesdays or during sales.",
    };
  }
};

// Build a proper Google Flights booking URL
const buildGoogleFlightsUrl = (
  departureAirport: string,
  arrivalAirport: string,
  departureDate: string,
  returnDate?: string,
  passengers: number = 1,
  cabinClass: string = "economy"
): string => {
  // Format: YYYY-MM-DD
  const cabinMap: Record<string, number> = {
    economy: 1,
    premium_economy: 2,
    business: 3,
    first: 4,
  };
  
  const cabin = cabinMap[cabinClass] || 1;
  
  // Google Flights direct search URL
  // Format: /flights/DEP-ARR/2024-01-15/2024-01-22
  const baseUrl = "https://www.google.com/travel/flights/search";
  
  let flightPath = `${departureAirport}-${arrivalAirport}/${departureDate}`;
  if (returnDate) {
    flightPath += `/${returnDate}`;
  }
  
  // Build query params for passengers and cabin
  const params = new URLSearchParams({
    tfs: "CBwQAhAA", // Required for the search to work
    curr: "USD",
    hl: "en",
    gl: "us",
  });
  
  // The direct URL format that works
  return `https://www.google.com/travel/flights/search?q=flights%20from%20${departureAirport}%20to%20${arrivalAirport}%20on%20${departureDate}${returnDate ? `%20return%20${returnDate}` : ''}&curr=USD`;
};

// Main scoring function
export const scoreFlights = (
  flights: FlightResult[],
  preferences: FlightPreferences,
  allFlightPrices?: number[],
  passengers: number = 1
): ScoredFlight[] => {
  if (!flights || flights.length === 0) return [];

  // Get price range for normalization
  const prices = allFlightPrices || flights.map(f => f.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Get travel time range
  const travelTimes = flights.map(f => {
    let total = 0;
    for (const it of f.itineraries) {
      for (const seg of it.segments) {
        total += parseDuration(seg.duration);
      }
    }
    return total;
  });
  const minTime = Math.min(...travelTimes);
  const maxTime = Math.max(...travelTimes);
  const timeRange = maxTime - minTime || 1;

  const scoredFlights: ScoredFlight[] = flights.map((flight, index) => {
    const breakdown: ScoreBreakdown = {
      nonstop: 0,
      travelTime: 0,
      layoverQuality: 0,
      departureTime: 0,
      arrivalTime: 0,
      airlineReliability: 0,
      price: 0,
      total: 0,
    };

    // Score nonstop
    const isNonstop = flight.itineraries.every(it => it.segments.length === 1);
    const hasOneStop = flight.itineraries.every(it => it.segments.length <= 2);
    breakdown.nonstop = isNonstop ? 100 : hasOneStop ? 60 : 30;

    // Penalize if user prefers nonstop and this isn't
    if (preferences.prefer_nonstop && !isNonstop) {
      breakdown.nonstop = Math.max(0, breakdown.nonstop - 30);
    }

    // Score travel time (normalized)
    const travelTime = travelTimes[index];
    breakdown.travelTime = 100 - ((travelTime - minTime) / timeRange) * 100;

    // Score layover quality
    let layoverScore = 100;
    for (const it of flight.itineraries) {
      if (it.segments.length > 1) {
        for (let i = 0; i < it.segments.length - 1; i++) {
          const connectionAirport = it.segments[i].arrivalAirport;
          const quality = getAirportQuality(connectionAirport);
          layoverScore = Math.min(layoverScore, quality.score);
        }
      }
    }
    breakdown.layoverQuality = layoverScore;

    // Score departure time
    const firstSegment = flight.itineraries[0]?.segments[0];
    breakdown.departureTime = scoreDepartureTime(
      getHour(firstSegment?.departureTime),
      preferences
    );

    // Score arrival time
    const lastItinerary = flight.itineraries[0];
    const lastSegment = lastItinerary?.segments[lastItinerary.segments.length - 1];
    const arrivalHour = getHour(lastSegment?.arrivalTime);
    // Prefer arrivals before 10pm
    breakdown.arrivalTime = arrivalHour >= 22 ? 50 : arrivalHour <= 6 ? 60 : 85;

    // Score airline reliability
    breakdown.airlineReliability = scoreAirlineReliability(
      firstSegment?.airline || "",
      preferences
    );

    // Score price (normalized, lower is better)
    breakdown.price = 100 - ((flight.price - minPrice) / priceRange) * 100;

    // Calculate weighted total
    breakdown.total = Math.round(
      (breakdown.nonstop * WEIGHTS.nonstop +
        breakdown.travelTime * WEIGHTS.travelTime +
        breakdown.layoverQuality * WEIGHTS.layoverQuality +
        breakdown.departureTime * WEIGHTS.departureTime +
        breakdown.arrivalTime * WEIGHTS.arrivalTime +
        breakdown.airlineReliability * WEIGHTS.airlineReliability +
        breakdown.price * WEIGHTS.price) /
        100
    );

    // Assign badges
    const badges: string[] = [];
    if (isNonstop) badges.push("Nonstop");
    if (breakdown.price === 100) badges.push("Cheapest");
    if (breakdown.travelTime > 90) badges.push("Fastest");
    if (breakdown.airlineReliability > 85) badges.push("Reliable");

    // Warnings
    const warnings: string[] = [];
    if (!preferences.red_eye_allowed) {
      const depHour = getHour(firstSegment?.departureTime);
      if (depHour >= 21 || depHour < 5) {
        warnings.push("Red-eye flight (you prefer to avoid these)");
      }
    }

    // Generate preference matches (positives and negatives)
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
    
    const airline = AIRLINES.find(a => (firstSegment?.airline || "").startsWith(a.code));
    if (airline && preferences.preferred_airlines.includes(airline.name)) {
      preferenceMatches.push({ type: "positive", label: `${airline.name}`, detail: "Your preferred airline" });
    }
    
    if (breakdown.airlineReliability > 85) {
      preferenceMatches.push({ type: "positive", label: "Highly reliable", detail: `${breakdown.airlineReliability}% reliability` });
    }
    
    if (travelTime <= minTime + 30) {
      preferenceMatches.push({ type: "positive", label: "Short travel time" });
    }
    
    if (breakdown.price > 90) {
      preferenceMatches.push({ type: "positive", label: "Great price", detail: "Among the cheapest" });
    }

    // Check for wifi in extensions
    const hasWifi = flight.itineraries.some(it => 
      it.segments.some(seg => 
        (seg.extensions || []).some((ext: string) => 
          ext?.toLowerCase().includes('wi-fi') || ext?.toLowerCase().includes('wifi')
        )
      )
    );
    if (hasWifi) {
      preferenceMatches.push({ type: "positive", label: "Has WiFi" });
    }
    
    // Negative matches
    if (!isNonstop && preferences.prefer_nonstop) {
      preferenceMatches.push({ type: "negative", label: "Has stops", detail: "You prefer non-stop" });
    }
    
    const depHourCheck = getHour(firstSegment?.departureTime);
    if ((depHourCheck >= 21 || depHourCheck < 5) && !preferences.red_eye_allowed) {
      preferenceMatches.push({ type: "negative", label: "Red-eye flight", detail: "You prefer to avoid" });
    }
    
    if (airline && preferences.avoided_airlines.includes(airline.name)) {
      preferenceMatches.push({ type: "negative", label: `${airline.name}`, detail: "Airline you avoid" });
    }
    
    if (breakdown.layoverQuality < 60) {
      preferenceMatches.push({ type: "negative", label: "Limited airport", detail: "Connection airport has fewer amenities" });
    }

    // Check for long layovers
    for (const it of flight.itineraries) {
      if (it.segments.length > 1) {
        for (let i = 0; i < it.segments.length - 1; i++) {
          const arrival = new Date(it.segments[i].arrivalTime);
          const nextDeparture = new Date(it.segments[i + 1].departureTime);
          const connectionMinutes = (nextDeparture.getTime() - arrival.getTime()) / (1000 * 60);
          
          if (connectionMinutes > preferences.max_layover_hours * 60) {
            preferenceMatches.push({ type: "negative", label: "Long layover", detail: `${Math.round(connectionMinutes / 60)}h layover exceeds your ${preferences.max_layover_hours}h max` });
            break;
          } else if (connectionMinutes <= 75) {
            preferenceMatches.push({ type: "negative", label: "Tight connection", detail: `${connectionMinutes}min layover is tight` });
            break;
          }
        }
      }
    }

    // Check for no wifi (if we can determine it)
    if (!hasWifi && flight.itineraries.some(it => it.segments.some(seg => seg.extensions && seg.extensions.length > 0))) {
      preferenceMatches.push({ type: "negative", label: "No WiFi listed" });
    }

    // Budget airline warnings (extra fees)
    if (["NK", "F9"].includes(firstSegment?.airline || "")) {
      preferenceMatches.push({ type: "negative", label: "Carry-on fee", detail: "Carry-on bags cost extra" });
      if (!preferences.carry_on_only) {
        preferenceMatches.push({ type: "negative", label: "Bag fees extra", detail: "Ultra low-cost carrier" });
      }
    }
    
    if (preferences.family_mode) {
      const stressScore = calculateFamilyStressScore(flight, preferences);
      if (stressScore > 50) {
        preferenceMatches.push({ type: "negative", label: "High family stress", detail: "Tight connections or late arrivals" });
      } else if (stressScore < 20) {
        preferenceMatches.push({ type: "positive", label: "Family-friendly", detail: "Good timing and connections" });
      }
    }

    // Build booking URL with correct dates from the actual flight
    const departureAirport = firstSegment?.departureAirport || "";
    const arrivalAirport = lastSegment?.arrivalAirport || "";
    const departureDateStr = firstSegment?.departureTime ? new Date(firstSegment.departureTime).toISOString().split('T')[0] : "";
    const returnSegment = flight.itineraries[1]?.segments[0];
    const returnDateStr = returnSegment?.departureTime ? new Date(returnSegment.departureTime).toISOString().split('T')[0] : "";
    
    const bookingUrl = departureAirport && arrivalAirport && departureDateStr
      ? buildGoogleFlightsUrl(departureAirport, arrivalAirport, departureDateStr, returnDateStr, passengers)
      : undefined;

    // Calculate per-ticket pricing
    const pricePerTicket = passengers > 0 ? flight.price / passengers : flight.price;
    
    // Calculate price insight
    const allPrices = flights.map(f => f.price);
    const priceInsight = calculatePriceInsight(flight.price, allPrices);

    const scoredFlight: ScoredFlight = {
      ...flight,
      score: breakdown.total,
      breakdown,
      badges,
      explanation: "",
      warnings,
      familyStressScore: preferences.family_mode
        ? calculateFamilyStressScore(flight, preferences)
        : undefined,
      delayRisk: estimateDelayRisk(flight),
      hiddenCosts: detectHiddenCosts(flight, preferences),
      preferenceMatches,
      bookingUrl,
      pricePerTicket,
      passengers,
      priceInsight,
    };

    scoredFlight.explanation = generateExplanation(scoredFlight, preferences);
    
    // Generate match explanation for non-perfect scores
    if (breakdown.total < 100) {
      scoredFlight.matchExplanation = generateMatchExplanation(scoredFlight, preferences);
    }

    return scoredFlight;
  });

  // Sort by score descending
  return scoredFlights.sort((a, b) => b.score - a.score);
};

// Get categorized results
export const categorizeFlights = (scoredFlights: ScoredFlight[]): {
  bestOverall: ScoredFlight | null;
  fastest: ScoredFlight | null;
  cheapest: ScoredFlight | null;
  bestForFamilies: ScoredFlight | null;
} => {
  if (scoredFlights.length === 0) {
    return { bestOverall: null, fastest: null, cheapest: null, bestForFamilies: null };
  }

  const bestOverall = scoredFlights[0];
  const fastest = [...scoredFlights].sort((a, b) => b.breakdown.travelTime - a.breakdown.travelTime)[0];
  const cheapest = [...scoredFlights].sort((a, b) => a.price - b.price)[0];
  const bestForFamilies = [...scoredFlights].sort((a, b) => 
    (a.familyStressScore || 100) - (b.familyStressScore || 100)
  )[0];

  return { bestOverall, fastest, cheapest, bestForFamilies };
};
