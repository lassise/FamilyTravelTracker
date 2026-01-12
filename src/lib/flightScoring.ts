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
const parseDuration = (duration: string | number): number => {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;
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

// Score airline reliability
const scoreAirlineReliability = (airlineCode: string, preferences: FlightPreferences): number => {
  const airline = AIRLINES.find(a => airlineCode.startsWith(a.code));
  let score = airline?.reliability || 70;

  // Bonus for preferred airlines
  if (preferences.preferred_airlines.includes(airline?.name || "")) {
    score = Math.min(100, score + 15);
  }

  // Penalty for avoided airlines
  if (preferences.avoided_airlines.includes(airline?.name || "")) {
    score = Math.max(0, score - 40);
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

// Main scoring function
export const scoreFlights = (
  flights: FlightResult[],
  preferences: FlightPreferences,
  allFlightPrices?: number[]
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
    };

    scoredFlight.explanation = generateExplanation(scoredFlight, preferences);

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
