import { scoreFlights, type FlightResult } from "@/lib/flightScoring";
import type { FlightPreferences } from "@/hooks/useFlightPreferences";

/**
 * Dev-only self-test to validate avoided-airline behavior.
 *
 * Scenario: FLL -> LAS on 2026-01-24 with Spirit (NK) marked as avoided.
 * Expectation:
 * - Spirit flight is flagged as avoided (isAvoidedAirline === true)
 * - Spirit flight is not the "recommended"/top choice when any non-avoided flight exists
 */
export function runFlightAvoidanceSelfTest(): void {
  const preferences = {
    // Defaults for fields scoring expects (keep minimal + neutral)
    preferred_airlines: [],
    avoided_airlines: ["Spirit Airlines", "NK"],
    preferred_alliances: [],
    preferred_departure_times: [],
    red_eye_allowed: true,
    prefer_nonstop: false,
    alternate_airports: false,
    min_connection_minutes: 45,
    max_layover_hours: 12,
    family_min_connection_minutes: 45,
    carry_on_only: false,
    needs_window_for_car_seat: false,
    default_checked_bags: 0,
    seat_preference: [],
    entertainment_seatback: "none",
    entertainment_mobile: "none",
    usb_charging: "none",
    legroom_preference: "none",
  } as unknown as FlightPreferences;

  const passengerBreakdown = { adults: 2, children: 0, infantsInSeat: 0, infantsOnLap: 0 };

  const spiritFlight: FlightResult = {
    id: "TEST_NK_FLL_LAS_2026-01-24",
    price: 140,
    currency: "USD",
    itineraries: [
      {
        segments: [
          {
            departureAirport: "FLL",
            departureTime: "2026-01-24T09:00:00-05:00",
            arrivalAirport: "LAS",
            arrivalTime: "2026-01-24T11:30:00-08:00",
            airline: "NK",
            flightNumber: "NK123",
            duration: 330,
            stops: 0,
            cabin: "economy",
          },
        ],
      },
    ],
  };

  const nonAvoidedFlight: FlightResult = {
    id: "TEST_AA_FLL_LAS_2026-01-24",
    price: 180,
    currency: "USD",
    itineraries: [
      {
        segments: [
          {
            departureAirport: "FLL",
            departureTime: "2026-01-24T10:00:00-05:00",
            arrivalAirport: "LAS",
            arrivalTime: "2026-01-24T12:30:00-08:00",
            airline: "AA",
            flightNumber: "AA456",
            duration: 330,
            stops: 0,
            cabin: "economy",
          },
        ],
      },
    ],
  };

  const scored = scoreFlights(
    [spiritFlight, nonAvoidedFlight],
    preferences,
    undefined,
    passengerBreakdown,
    "economy"
  );

  const spirit = scored.find((f) => f.id === spiritFlight.id);
  const aa = scored.find((f) => f.id === nonAvoidedFlight.id);

  const failed: string[] = [];
  if (!spirit) failed.push("Missing Spirit flight in scored results");
  if (!aa) failed.push("Missing non-avoided flight in scored results");

  if (spirit && !spirit.isAvoidedAirline) {
    failed.push(
      `Spirit flight was NOT flagged avoided (isAvoidedAirline=false). score=${spirit.score}, airline=${spirit.itineraries[0]?.segments[0]?.airline}`
    );
  }

  // Apply the same "avoid to bottom" sort + "Best Match" selection semantics as the UI.
  const sorted = [...scored].sort((a, b) => {
    const aAvoided = Boolean(a.isAvoidedAirline);
    const bAvoided = Boolean(b.isAvoidedAirline);
    if (aAvoided && !bAvoided) return 1;
    if (!aAvoided && bAvoided) return -1;
    return b.score - a.score;
  });

  const featured = sorted.filter((f) => !f.isAvoidedAirline);
  const bestOverall = (featured.length > 0 ? featured : sorted)[0];

  if (bestOverall?.id === spiritFlight.id) {
    failed.push(
      `Spirit flight was selected as Best Match despite being avoided. spiritScore=${spirit?.score}, otherScore=${aa?.score}`
    );
  }

  if (failed.length > 0) {
    // Throw to make it loud in console during dev.
     
    console.error("[flightAvoidanceSelfTest] FAILED", failed, { scored, sorted, bestOverall });
    throw new Error(`flightAvoidanceSelfTest failed: ${failed.join("; ")}`);
  }

   
  console.info("[flightAvoidanceSelfTest] PASSED", {
    spiritScore: spirit?.score,
    spiritAvoided: spirit?.isAvoidedAirline,
    bestOverallId: bestOverall?.id,
  });
}

