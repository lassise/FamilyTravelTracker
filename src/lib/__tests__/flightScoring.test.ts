/**
 * Flight Scoring Tests
 * 
 * These tests verify the airline preference matching and ranking logic.
 * 
 * To run these tests with vitest:
 *   1. Install: npm install -D vitest @vitest/ui
 *   2. Add to package.json scripts: "test": "vitest"
 *   3. Run: npm test
 * 
 * Test cases cover:
 * - Preferred airline matching (by name and code)
 * - Avoided airline matching (by name and code)
 * - Ranking consistency (avoided airlines cannot be #1)
 * - Top pick badge placement
 * - Score calculation with preferences
 */

import { scoreFlights } from '../flightScoring';
import type { FlightResult, FlightPreferences } from '../flightScoring';

// Helper to create a simple flight
const createFlight = (
  airline: string,
  price: number = 500,
  isNonstop: boolean = true
): FlightResult => ({
  id: `flight-${airline}-${price}`,
  price,
  currency: 'USD',
  itineraries: [{
    segments: [{
      departureAirport: 'JFK',
      departureTime: '2024-06-15T10:00:00Z',
      arrivalAirport: 'LAX',
      arrivalTime: '2024-06-15T13:00:00Z',
      airline,
      flightNumber: `${airline}123`,
      duration: 300,
      stops: isNonstop ? 0 : 1,
    }],
  }],
});

// Helper to create preferences
const createPreferences = (
  preferred: string[] = [],
  avoided: string[] = []
): FlightPreferences => ({
  home_airports: [],
  alternate_airports: [],
  prefer_nonstop: true,
  preferred_departure_times: [],
  red_eye_allowed: false,
  preferred_airlines: preferred,
  avoided_airlines: avoided,
  preferred_alliances: [],
  family_mode: false,
  family_min_connection_minutes: 60,
  min_connection_minutes: 60,
  max_layover_hours: 4,
  max_stops: 0,
  max_total_travel_hours: 24,
  carry_on_only: false,
  default_checked_bags: 0,
  seat_preference: [],
  needs_window_for_car_seat: false,
  cabin_class: 'economy',
  search_mode: 'cash',
  entertainment_seatback: 'nice_to_have',
  entertainment_mobile: 'nice_to_have',
  usb_charging: 'nice_to_have',
  legroom_preference: 'nice_to_have',
  min_legroom_inches: null,
  nonstop_priority: 'nice_to_have',
  departure_time_priority: 'nice_to_have',
  airline_priority: 'nice_to_have',
  layover_priority: 'nice_to_have',
  seat_priority: 'nice_to_have',
});

// Test cases (can be run with vitest when installed)
export const testCases = {
  // Test: Preferred airline by name matches carrier code
  testPreferredByName: () => {
    const flights = [createFlight('B6', 500), createFlight('AA', 450)];
    const preferences = createPreferences(['JetBlue'], []);
    const scored = scoreFlights(flights, preferences);
    const jetblue = scored.find(f => f.itineraries[0].segments[0].airline === 'B6');
    return {
      passed: jetblue?.isPreferredAirline === true,
      message: 'JetBlue should be recognized as preferred when preference is "JetBlue"',
    };
  },

  // Test: Preferred airline by code matches carrier name
  testPreferredByCode: () => {
    const flights = [createFlight('B6', 500), createFlight('AA', 450)];
    const preferences = createPreferences(['B6'], []);
    const scored = scoreFlights(flights, preferences);
    const jetblue = scored.find(f => f.itineraries[0].segments[0].airline === 'B6');
    return {
      passed: jetblue?.isPreferredAirline === true,
      message: 'JetBlue should be recognized as preferred when preference is "B6"',
    };
  },

  // Test: Avoided airline penalty pushes NK below non-avoided options
  testAvoidedAirlinePenalty: () => {
    const flights = [createFlight('NK', 200), createFlight('B6', 500)];
    const preferences = createPreferences(['JetBlue'], ['Spirit']);
    const scored = scoreFlights(flights, preferences);
    const spirit = scored.find(f => f.isAvoidedAirline);
    const jetblue = scored.find(f => f.isPreferredAirline);
    const spiritIndex = scored.indexOf(spirit!);
    const jetblueIndex = scored.indexOf(jetblue!);
    return {
      passed: jetblueIndex < spiritIndex,
      message: 'Spirit (avoided) should be ranked below JetBlue (preferred) even if cheaper',
    };
  },

  // Test: Avoided airline cannot be #1 when non-avoided options exist
  testAvoidedCannotBeTopPick: () => {
    const flights = [createFlight('NK', 300), createFlight('B6', 500), createFlight('AA', 600)];
    const preferences = createPreferences(['JetBlue'], ['Spirit']);
    const scored = scoreFlights(flights, preferences);
    const first = scored[0];
    return {
      passed: first.isAvoidedAirline === false,
      message: 'Avoided airline should not be #1 when non-avoided options exist',
    };
  },

  // Test: Sorting + labeling consistency (top pick is index 0 of sorted list)
  testTopPickConsistency: () => {
    const flights = [createFlight('B6', 500), createFlight('AA', 600), createFlight('DL', 700)];
    const preferences = createPreferences([], []);
    const scored = scoreFlights(flights, preferences);
    const topPicks = scored.filter(f => f.explanation.includes('Top pick'));
    return {
      passed: topPicks.length === 1 && topPicks[0] === scored[0],
      message: 'Top pick should appear only on first flight in sorted list',
    };
  },
};

// Manual test runner (for development/debugging)
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  console.log('Running flight scoring tests...\n');
  let passed = 0;
  let failed = 0;
  
  Object.entries(testCases).forEach(([name, testFn]) => {
    try {
      const result = testFn();
      if (result.passed) {
        console.log(`✅ ${name}: ${result.message}`);
        passed++;
      } else {
        console.error(`❌ ${name}: ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${name}: Error - ${error}`);
      failed++;
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}
