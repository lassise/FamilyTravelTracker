// Google Flights deep link builder for all trip types
import { AIRLINES } from "./airportsData";

export interface GoogleFlightsParams {
  tripType: "oneway" | "roundtrip" | "multicity";
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
  stops?: string; // "nonstop", "1_or_fewer", "2_or_fewer"
  segments?: Array<{
    origin: string;
    destination: string;
    date: string;
  }>;
  airlineCode?: string; // IATA airline code (e.g., "B6", "NK") for filtering
}

const CABIN_MAP: Record<string, string> = {
  economy: "1",
  premium_economy: "2",
  business: "3",
  first: "4",
  any: "1",
};

// Helper to get airline name from code
const getAirlineName = (airlineCode: string): string | undefined => {
  const normalized = airlineCode.trim().toUpperCase();
  const airline = AIRLINES.find((a) =>
    normalized === a.code || normalized.startsWith(a.code)
  );
  return airline?.name;
};

// Build a Google Flights URL for one-way trips
export const buildOneWayUrl = (
  origin: string,
  destination: string,
  departDate: string,
  passengers: number = 1,
  cabinClass: string = "economy",
  airlineCode?: string
): string => {
  // Google Flights uses natural language query format via /search endpoint
  // Format: "Flights to DEST from ORIG on YYYY-MM-DD one way with [passengers] [cabin class] on [airline]"
  // Based on: https://stackoverflow.com/questions/68959917/how-can-i-decode-recreate-google-flights-search-urls
  const baseUrl = "https://www.google.com/travel/flights/search";
  const queryParts: string[] = [];

  // Core route and date (use "to DEST from ORIG" format per Google's expected format)
  queryParts.push(`Flights to ${destination} from ${origin} on ${departDate}`);
  queryParts.push("one way");

  // Add passengers with "with" keyword
  if (passengers === 1) {
    queryParts.push("with one adult");
  } else {
    queryParts.push(`with ${passengers} adults`);
  }

  // Add cabin class (only if not economy)
  if (cabinClass && cabinClass !== "economy" && cabinClass !== "any") {
    const cabinMap: Record<string, string> = {
      premium_economy: "premium economy",
      business: "business",
      first: "first",
    };
    const cabinName = cabinMap[cabinClass] || cabinClass;
    queryParts.push(`${cabinName} class`);
  }

  // Add airline if provided (use airline name if available, otherwise code)
  if (airlineCode) {
    const airlineName = getAirlineName(airlineCode);
    if (airlineName) {
      queryParts.push(`on ${airlineName}`);
    } else {
      // Fallback to code if name not found
      const code = airlineCode.trim().toUpperCase().substring(0, 2);
      if (/^[A-Z]{2}$/.test(code)) {
        queryParts.push(`on ${code}`);
      }
    }
  }

  const query = queryParts.join(" ");
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("curr", "USD");

  return `${baseUrl}?${params.toString()}`;
};

// Build a Google Flights URL for round-trip
export const buildRoundTripUrl = (
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string,
  passengers: number = 1,
  cabinClass: string = "economy",
  airlineCode?: string
): string => {
  // Google Flights uses natural language query format via /search endpoint
  // Format: "Flights to DEST from ORIG on YYYY-MM-DD through YYYY-MM-DD with [passengers] [cabin class] on [airline]"
  // Based on: https://stackoverflow.com/questions/68959917/how-can-i-decode-recreate-google-flights-search-urls
  const baseUrl = "https://www.google.com/travel/flights/search";
  const queryParts: string[] = [];

  // Core route and dates (use "to DEST from ORIG" format and "through" for round-trip)
  queryParts.push(`Flights to ${destination} from ${origin} on ${departDate} through ${returnDate}`);

  // Add passengers with "with" keyword
  if (passengers === 1) {
    queryParts.push("with one adult");
  } else {
    queryParts.push(`with ${passengers} adults`);
  }

  // Add cabin class (only if not economy)
  if (cabinClass && cabinClass !== "economy" && cabinClass !== "any") {
    const cabinMap: Record<string, string> = {
      premium_economy: "premium economy",
      business: "business",
      first: "first",
    };
    const cabinName = cabinMap[cabinClass] || cabinClass;
    queryParts.push(`${cabinName} class`);
  }

  // Add airline if provided (only if we can get a valid airline name)
  // Don't include invalid airline codes - Google Flights won't recognize them
  if (airlineCode) {
    const airlineName = getAirlineName(airlineCode);
    if (airlineName) {
      queryParts.push(`on ${airlineName}`);
    }
    // Don't fallback to code - if we can't find the airline name, skip it
    // Invalid codes like "JE" will break the search
  }

  const query = queryParts.join(" ");
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("curr", "USD");

  return `${baseUrl}?${params.toString()}`;
};

// Build a Google Flights URL for multi-city
export const buildMultiCityUrl = (
  segments: Array<{ origin: string; destination: string; date: string }>,
  passengers: number = 1,
  cabinClass: string = "economy",
  airlineCode?: string
): string => {
  // Google Flights multi-city uses natural language format via /search endpoint
  // Format: "Multi-city flights to DEST1 from ORIG1 on DATE1, to DEST2 from ORIG2 on DATE2 with [passengers] [cabin class] on [airline]"
  const baseUrl = "https://www.google.com/travel/flights/search";
  const queryParts: string[] = [];

  // Build segment descriptions (use "to DEST from ORIG" format)
  const segmentDescriptions = segments
    .filter((s) => s.origin && s.destination && s.date)
    .map((s) => `to ${s.destination} from ${s.origin} on ${s.date}`)
    .join(", ");

  queryParts.push(`Multi-city flights ${segmentDescriptions}`);

  // Add passengers with "with" keyword
  if (passengers === 1) {
    queryParts.push("with one adult");
  } else {
    queryParts.push(`with ${passengers} adults`);
  }

  // Add cabin class (only if not economy)
  if (cabinClass && cabinClass !== "economy" && cabinClass !== "any") {
    const cabinMap: Record<string, string> = {
      premium_economy: "premium economy",
      business: "business",
      first: "first",
    };
    const cabinName = cabinMap[cabinClass] || cabinClass;
    queryParts.push(`${cabinName} class`);
  }

  // Attempt to add airline filter (may not work for multi-city, but won't break)
  // Only include if we can get a valid airline name
  if (airlineCode) {
    const airlineName = getAirlineName(airlineCode);
    if (airlineName) {
      queryParts.push(`on ${airlineName}`);
    }
    // Don't fallback to code - invalid codes will break the search
  }

  const query = queryParts.join(" ");
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("curr", "USD");

  return `${baseUrl}?${params.toString()}`;
};

// Helper to extract and validate airline code from flight data
const extractAirlineCode = (airlineInput: string | null | undefined): string | undefined => {
  if (!airlineInput) return undefined;

  // Extract IATA code (first 2 characters, e.g., "B6" from "B61707")
  const trimmed = airlineInput.trim().toUpperCase();
  if (trimmed.length >= 2) {
    const potentialCode = trimmed.substring(0, 2);
    // Validate: must be 2 letters AND exist in AIRLINES list
    if (/^[A-Z]{2}$/.test(potentialCode)) {
      // Only return if it's a valid airline code in our database
      const isValidAirline = AIRLINES.some(a => a.code === potentialCode);
      if (isValidAirline) {
        return potentialCode;
      }
    }
  }

  return undefined;
};

// Main function to build appropriate URL based on trip type
export const buildGoogleFlightsUrl = (params: GoogleFlightsParams): string => {
  const { tripType, origin, destination, departDate, returnDate, passengers = 1, cabinClass = "economy", segments, airlineCode } = params;

  // Normalize airline code if provided (extract from name/code if needed)
  const normalizedAirlineCode = airlineCode ? extractAirlineCode(airlineCode) : undefined;

  switch (tripType) {
    case "oneway":
      return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass, normalizedAirlineCode);

    case "roundtrip":
      if (!returnDate) {
        // Fallback to one-way if no return date
        return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass, normalizedAirlineCode);
      }
      return buildRoundTripUrl(origin, destination, departDate, returnDate, passengers, cabinClass, normalizedAirlineCode);

    case "multicity":
      if (segments && segments.length > 0) {
        // Multi-city airline filtering may not be fully supported, but we'll try
        if (normalizedAirlineCode) {
          console.warn("Airline filtering for multi-city trips may not be fully supported by Google Flights URL format");
        }
        return buildMultiCityUrl(segments, passengers, cabinClass, normalizedAirlineCode);
      }
      // Fallback
      return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass, normalizedAirlineCode);

    default:
      return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass, normalizedAirlineCode);
  }
};

// Generate a match checklist for a selected flight
export interface FlightMatchInfo {
  legLabel: string;
  airline: string;
  flightNumber?: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  stops: number;
  connectionAirports: string[];
  totalDuration: number;
  price: number;
}

export const generateMatchChecklist = (flights: FlightMatchInfo[]): string => {
  const lines: string[] = [
    "=== MATCH THIS FLIGHT ON GOOGLE FLIGHTS ===",
    "",
  ];

  flights.forEach((flight) => {
    lines.push(`📍 ${flight.legLabel}`);
    lines.push(`   Airline: ${flight.airline}${flight.flightNumber ? ` ${flight.flightNumber}` : ""}`);
    lines.push(`   Departs: ${flight.departureTime} from ${flight.departureAirport}`);
    lines.push(`   Arrives: ${flight.arrivalTime} at ${flight.arrivalAirport}`);
    lines.push(
      `   Stops: ${flight.stops === 0 ? "Nonstop" : `${flight.stops} (via ${flight.connectionAirports.join(", ")})`}`
    );
    lines.push(
      `   Duration: ${Math.floor(flight.totalDuration / 60)}h ${flight.totalDuration % 60}m`
    );
    lines.push(`   Price: $${flight.price}`);
    lines.push("");
  });

  lines.push("Look for matching flight numbers and times.");
  lines.push("Prices may vary slightly on Google Flights.");

  return lines.join("\n");
};

// Log booking event for analytics
export const logBookingEvent = (
  eventType: "oneway" | "roundtrip" | "multicity",
  details: Record<string, any>
): void => {
  // In a real app, you'd send this to an analytics service
  // Example: analytics.track(`flight_booking_${eventType}_clicked`, details);
};
