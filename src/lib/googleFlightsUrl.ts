// Google Flights deep link builder for all trip types

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
}

const CABIN_MAP: Record<string, string> = {
  economy: "1",
  premium_economy: "2",
  business: "3",
  first: "4",
  any: "1",
};

// Build a Google Flights URL for one-way trips
export const buildOneWayUrl = (
  origin: string,
  destination: string,
  departDate: string,
  passengers: number = 1,
  cabinClass: string = "economy"
): string => {
  // Google Flights uses a search-based URL format
  // The most reliable format is: /travel/flights?q=Flights from [ORIGIN] to [DEST] on [DATE]
  const baseUrl = "https://www.google.com/travel/flights";
  const params = new URLSearchParams();

  let query = `Flights from ${origin} to ${destination}`;
  if (departDate) {
    query += ` on ${departDate}`;
  }

  params.set("q", query);

  if (passengers > 1) {
    params.set("pax", passengers.toString());
  }

  return `${baseUrl}?${params.toString()}`;
};

// Build a Google Flights URL for round-trip
export const buildRoundTripUrl = (
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string,
  passengers: number = 1,
  cabinClass: string = "economy"
): string => {
  const baseUrl = "https://www.google.com/travel/flights";
  const params = new URLSearchParams();

  let query = `Flights from ${origin} to ${destination} on ${departDate} returning ${returnDate}`;

  params.set("q", query);

  if (passengers > 1) {
    params.set("pax", passengers.toString());
  }

  return `${baseUrl}?${params.toString()}`;
};

// Build a Google Flights URL for multi-city
export const buildMultiCityUrl = (
  segments: Array<{ origin: string; destination: string; date: string }>,
  passengers: number = 1,
  cabinClass: string = "economy"
): string => {
  // Google Flights multi-city uses a specific URL structure
  // The format includes origin/destination pairs
  const baseUrl = "https://www.google.com/travel/flights";
  
  // Build a descriptive query that Google can interpret
  // Format: Multi-city from [A] to [B] on [date1], from [C] to [D] on [date2]
  const segmentDescriptions = segments
    .filter((s) => s.origin && s.destination && s.date)
    .map((s) => `from ${s.origin} to ${s.destination} on ${s.date}`)
    .join(", ");

  const query = `Multi-city flights ${segmentDescriptions}`;

  const params = new URLSearchParams();
  params.set("q", query);

  if (passengers > 1) {
    params.set("pax", passengers.toString());
  }

  return `${baseUrl}?${params.toString()}`;
};

// Main function to build appropriate URL based on trip type
export const buildGoogleFlightsUrl = (params: GoogleFlightsParams): string => {
  const { tripType, origin, destination, departDate, returnDate, passengers = 1, cabinClass = "economy", segments } = params;

  switch (tripType) {
    case "oneway":
      return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass);

    case "roundtrip":
      if (!returnDate) {
        // Fallback to one-way if no return date
        return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass);
      }
      return buildRoundTripUrl(origin, destination, departDate, returnDate, passengers, cabinClass);

    case "multicity":
      if (segments && segments.length > 0) {
        return buildMultiCityUrl(segments, passengers, cabinClass);
      }
      // Fallback
      return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass);

    default:
      return buildOneWayUrl(origin, destination, departDate, passengers, cabinClass);
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
  console.log(`[Flight Booking] ${eventType}`, details);
  
  // In a real app, you'd send this to an analytics service
  // Example: analytics.track(`flight_booking_${eventType}_clicked`, details);
};
