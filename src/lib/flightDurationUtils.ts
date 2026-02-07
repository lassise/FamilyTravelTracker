/**
 * Flight Duration Calculation Utilities
 * 
 * Handles accurate calculation of total trip duration including:
 * - All flight segments
 * - All layovers between segments
 * - Day changes (overnight, +1 day)
 * - Multiple layovers (3+ segments)
 * - Timezone-aware calculations for international flights
 */

import { getAirportTimezone, hasAllTimezones } from './airportTimezones';

/**
 * Parse a datetime string in a specific timezone and return UTC Date
 * This is the preferred method for timezone-aware parsing
 * 
 * Uses a simpler approach: create the date as if it's in UTC, then adjust
 * by the timezone offset at that specific date/time.
 * 
 * @param dateTimeStr - Time string (e.g., "14:30" or "2:30 PM")
 * @param baseDate - Base date (YYYY-MM-DD)
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @returns Date object in UTC, or null if parsing fails
 */
export function parseDateTimeInTimezone(
  dateTimeStr: string,
  baseDate: string,
  timezone: string
): Date | null {
  if (!dateTimeStr || !baseDate || !timezone) return null;

  try {
    // Extract time from dateTimeStr
    const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let hours = 0;
    let minutes = 0;

    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
      const isPM = timeMatch[3]?.toUpperCase() === 'PM';

      // Validate parsed values
      if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        return null;
      }

      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      // Try 24-hour format
      const time24Match = dateTimeStr.match(/(\d{1,2}):(\d{2})/);
      if (time24Match) {
        hours = parseInt(time24Match[1]);
        minutes = parseInt(time24Match[2]);

        // Validate parsed values
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null;
        }
      } else {
        return null;
      }
    }

    // Create date string in format: YYYY-MM-DDTHH:mm:ss
    const dateStr = baseDate.includes('T')
      ? baseDate.split('T')[0]
      : baseDate;

    // Parse the date components
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) {
      return null; // Invalid date format
    }

    const [year, month, day] = dateParts.map(Number);

    // Validate parsed date components
    if (isNaN(year) || isNaN(month) || isNaN(day) ||
      year < 2000 || year > 2100 ||
      month < 1 || month > 12 ||
      day < 1 || day > 31) {
      return null; // Invalid date values
    }

    // Method: Create a date in UTC, then check what it shows in the timezone
    // Adjust until it matches
    let guessUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

    // Get what this UTC time displays as in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Iterate to find the correct UTC time (usually converges in 1-2 iterations)
    let lastDiff = Infinity;
    for (let i = 0; i < 5; i++) {
      const parts = formatter.formatToParts(guessUTC);
      const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
      const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
      const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
      const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

      // Check if we have a match
      if (tzYear === year && tzMonth === month - 1 && tzDay === day &&
        tzHour === hours && tzMinute === minutes) {
        return guessUTC;
      }

      // Calculate the difference and adjust
      // The difference is between what we want (in timezone) and what we have (in timezone)
      const tzTime = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute));
      const desiredTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      const diffMs = desiredTime.getTime() - tzTime.getTime();

      // Safety check: if we're not converging or diverging, break
      if (Math.abs(diffMs) < 1000) break; // Less than 1 second difference - close enough
      if (Math.abs(diffMs) >= Math.abs(lastDiff)) {
        // Not converging or diverging - break to avoid infinite loop
        break;
      }

      lastDiff = diffMs;

      // Adjust the guess by the difference
      guessUTC = new Date(guessUTC.getTime() + diffMs);
    }

    // Return the best guess we have
    return guessUTC;
  } catch (error) {
    console.warn('Timezone parsing failed:', error);
    return null;
  }
}

/**
 * Parse a datetime string and return a Date object
 * Handles various formats from SerpAPI and Google Flights
 * @deprecated Use parseDateTimeInTimezone for timezone-aware parsing
 */
export function parseDateTime(dateTimeStr: string, baseDate?: string): Date | null {
  if (!dateTimeStr) return null;

  try {
    // If it's already a valid ISO string, parse it directly
    if (dateTimeStr.includes('T') || dateTimeStr.includes('Z')) {
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) return date;
    }

    // If we have a base date (departure date), combine it with the time
    if (baseDate) {
      // Extract time from dateTimeStr (e.g., "14:30" or "2:30 PM")
      const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3]?.toUpperCase() === 'PM';

        // Handle 12-hour format
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        // Combine base date with parsed time
        // Handle both YYYY-MM-DD and Date object formats
        const date = baseDate.includes('T')
          ? new Date(baseDate)
          : new Date(baseDate + 'T00:00:00');
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    }

    // Try parsing as-is
    const date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) return date;

    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate total trip duration from first departure to final arrival
 * This is the preferred method as it automatically includes all layovers and day changes
 * NOW WITH TIMEZONE-AWARE CALCULATIONS
 * 
 * @param segments - Array of flight segments in order (must include departureAirport and arrivalAirport for timezone-aware calc)
 * @param layovers - Array of layover information (optional, for validation)
 * @param departureDate - Base departure date (YYYY-MM-DD) for parsing times
 * @returns Total duration in minutes, or null if calculation fails
 */
export function calculateTotalDuration(
  segments: Array<{
    departureTime: string;
    arrivalTime: string;
    departureAirport?: string;
    arrivalAirport?: string;
    duration?: number | string;
  }>,
  layovers?: Array<{
    duration?: number | string;
    overnight?: boolean;
  }>,
  departureDate?: string
): number | null {
  if (!segments || segments.length === 0) return null;

  // Get first departure and final arrival
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  // PRIORITY 1: If we have segment durations, prefer sum method
  // This gives the actual flight time (time in air + layover time), which is what users expect
  // The sum method is more accurate for flights with layovers because it represents actual time spent
  const hasAnySegmentDurations = segments.some(seg => seg.duration !== undefined && seg.duration !== null);

  if (hasAnySegmentDurations) {
    const sumResult = calculateTotalDurationBySum(segments, layovers);
    // Use sum if it's reasonable (positive and not too large)
    // This is preferred because it represents actual flight time, not elapsed wall-clock time
    if (sumResult > 0 && sumResult <= 2880) {
      return sumResult;
    }
  }

  if (!firstSegment?.departureTime || !lastSegment?.arrivalTime) {
    return null;
  }

  // PRIORITY 2: Use timezone-aware calculation if we have timezone data
  // This gives elapsed wall-clock time, which is useful when we don't have segment durations
  const hasTimezones = hasAllTimezones(segments);

  let firstDepartureUTC: Date | null = null;
  let finalArrivalUTC: Date | null = null;

  if (hasTimezones && departureDate) {
    // TIMEZONE-AWARE CALCULATION
    // Parse first departure in its timezone and convert to UTC
    const firstDepTimezone = firstSegment.departureAirport
      ? getAirportTimezone(firstSegment.departureAirport)
      : null;

    if (firstDepTimezone) {
      firstDepartureUTC = parseDateTimeInTimezone(
        firstSegment.departureTime,
        departureDate,
        firstDepTimezone
      );
    }

    // Parse final arrival in its timezone and convert to UTC
    const lastArrTimezone = lastSegment.arrivalAirport
      ? getAirportTimezone(lastSegment.arrivalAirport)
      : null;

    if (lastArrTimezone) {
      // For arrival, we need to determine which day it occurs on
      // Start with the departure date and adjust based on actual times
      let arrivalDate = departureDate;

      // Check for explicit overnight indicators first
      // Use type guard to safely check if segment has overnight property
      const hasOvernight = segments.some(seg =>
        typeof seg === 'object' && seg !== null && 'overnight' in seg && seg.overnight === true
      ) || (layovers && layovers.some(lay => lay.overnight));

      if (hasOvernight) {
        // Try next day if overnight indicator is present
        const depDate = new Date(departureDate + 'T00:00:00');
        depDate.setDate(depDate.getDate() + 1);
        arrivalDate = depDate.toISOString().split('T')[0];
      }

      // Parse arrival time
      finalArrivalUTC = parseDateTimeInTimezone(
        lastSegment.arrivalTime,
        arrivalDate,
        lastArrTimezone
      );

      // If we have both times, check if arrival is before departure (invalid)
      // This indicates arrival is on a later day - could be 1, 2, or more days
      if (finalArrivalUTC && firstDepartureUTC && finalArrivalUTC.getTime() < firstDepartureUTC.getTime()) {
        // Try adding days until arrival is after departure
        // Limit to 5 days to prevent infinite loop (no commercial flight > 5 days)
        let daysToAdd = 1;
        let adjustedArrivalUTC = finalArrivalUTC;

        while (daysToAdd <= 5 && adjustedArrivalUTC.getTime() < firstDepartureUTC.getTime()) {
          const depDate = new Date(arrivalDate + 'T00:00:00');
          depDate.setDate(depDate.getDate() + daysToAdd);
          const adjustedDateStr = depDate.toISOString().split('T')[0];

          const tempArrival = parseDateTimeInTimezone(
            lastSegment.arrivalTime,
            adjustedDateStr,
            lastArrTimezone
          );

          if (tempArrival && tempArrival.getTime() > firstDepartureUTC.getTime()) {
            adjustedArrivalUTC = tempArrival;
            break;
          }

          daysToAdd++;
        }

        finalArrivalUTC = adjustedArrivalUTC;
      }
    }
  }

  // Fallback to naive calculation if timezone parsing failed
  if (!firstDepartureUTC || !finalArrivalUTC) {
    // Use naive calculation (will be wrong for cross-timezone flights)
    // But we'll validate and fall back to sum if it seems wrong
    const firstDeparture = parseDateTime(firstSegment.departureTime, departureDate);
    if (!firstDeparture) return null;

    let finalArrival = parseDateTime(lastSegment.arrivalTime, departureDate);
    if (!finalArrival) return null;

    // Handle day changes
    if (finalArrival.getTime() < firstDeparture.getTime()) {
      finalArrival = new Date(finalArrival);
      finalArrival.setDate(finalArrival.getDate() + 1);
    }

    const durationMs = finalArrival.getTime() - firstDeparture.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    // If we don't have timezones, check if this might be an international flight
    // by checking if airports are different (simple heuristic)
    // Note: We can't reliably detect country from airport codes, so we use
    // a simpler check: if airports are different and we don't have timezone data,
    // prefer sum method to avoid timezone offset errors
    if (!hasTimezones && segments.length > 0) {
      const firstAirport = segments[0].departureAirport;
      const lastAirport = lastSegment.arrivalAirport;
      // If airports are different (likely international), use sum method
      if (firstAirport && lastAirport && firstAirport !== lastAirport) {
        // Use sum method to avoid timezone offset errors
        return calculateTotalDurationBySum(segments, layovers);
      }
    }

    // Validate naive calculation
    if (durationMinutes < 0 || durationMinutes > 2880) {
      return calculateTotalDurationBySum(segments, layovers);
    }

    return durationMinutes;
  }

  // Calculate duration from UTC times (timezone-aware)
  // This gives elapsed wall-clock time, which may differ from actual flight time due to timezones
  const durationMs = finalArrivalUTC.getTime() - firstDepartureUTC.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  // Validate: duration should be positive and reasonable
  if (durationMinutes < 0 || durationMinutes > 2880) {
    // Fallback to sum method if UTC calculation seems wrong
    return calculateTotalDurationBySum(segments, layovers);
  }

  // DST SANITY CHECK: Compare with sum method
  // If the difference is > 2 hours, there may be a DST issue - prefer sum method
  // This handles edge cases where the timezone iteration didn't fully converge
  if (hasAnySegmentDurations) {
    const sumDuration = calculateTotalDurationBySum(segments, layovers);
    if (sumDuration > 0 && Math.abs(durationMinutes - sumDuration) > 120) {
      // Large discrepancy suggests DST transition or parsing issue - use sum method
      return sumDuration;
    }
  }

  // If we have segment durations available, prefer sum method over timezone calculation
  // because sum gives actual flight time (what users expect), while timezone calc gives wall-clock time
  if (hasAnySegmentDurations) {
    const sumResult = calculateTotalDurationBySum(segments, layovers);
    // Use sum if it's reasonable, otherwise use timezone calculation
    if (sumResult > 0 && sumResult <= 2880) {
      return sumResult;
    }
  }

  return durationMinutes;
}

/**
 * Calculate total duration by summing segments and layovers
 * This is a fallback method when datetime calculation isn't possible
 * 
 * @param segments - Array of flight segments
 * @param layovers - Array of layover information
 * @returns Total duration in minutes
 */
export function calculateTotalDurationBySum(
  segments: Array<{ duration?: number | string }>,
  layovers?: Array<{ duration?: number | string }>
): number {
  let total = 0;

  // Sum all segment durations
  for (const seg of segments) {
    if (seg.duration) {
      const dur = parseDuration(seg.duration);
      total += dur;
    }
  }

  // Sum all layover durations
  if (layovers) {
    for (const layover of layovers) {
      if (layover.duration) {
        const dur = parseDuration(layover.duration);
        total += dur;
      }
    }
  }

  return total;
}

/**
 * Parse duration from various formats (ISO 8601, "5h 30m", number in minutes)
 */
function parseDuration(duration: number | string | undefined | null): number {
  if (duration === null || duration === undefined) return 0;
  if (typeof duration === 'number') return duration;
  if (typeof duration !== 'string') return 0;

  const durationStr = duration.trim();

  // Try ISO 8601 format (PT5H30M)
  const isoMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0');
    const minutes = parseInt(isoMatch[2] || '0');
    return hours * 60 + minutes;
  }

  // Try "Xh Ym" or "X hours Y minutes" format
  const hoursMatch = durationStr.match(/(\d+)\s*(?:h|hours?)/i);
  const minsMatch = durationStr.match(/(\d+)\s*(?:m|mins?|minutes?)/i);

  if (hoursMatch || minsMatch) {
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minsMatch ? parseInt(minsMatch[1]) : 0;
    return hours * 60 + minutes;
  }

  // Try pure number (assume minutes)
  const numMatch = durationStr.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }

  return 0;
}

/**
 * Calculate layover duration between two segments
 * Handles day changes and timezones correctly
 * 
 * @param segment1Arrival - Arrival time of first segment
 * @param segment2Departure - Departure time of second segment
 * @param baseDate - Base date for parsing
 * @param layoverAirport - Airport code where layover occurs (for timezone)
 * @returns Layover duration in minutes
 */
export function calculateLayoverDuration(
  segment1Arrival: string,
  segment2Departure: string,
  baseDate?: string,
  layoverAirport?: string
): number {
  if (!baseDate) return 0;

  // Try timezone-aware calculation if we have airport code
  if (layoverAirport) {
    const timezone = getAirportTimezone(layoverAirport);
    if (timezone) {
      // Both times are at the same airport, so same timezone
      const arrivalUTC = parseDateTimeInTimezone(segment1Arrival, baseDate, timezone);
      const departureUTC = parseDateTimeInTimezone(segment2Departure, baseDate, timezone);

      if (arrivalUTC && departureUTC) {
        // If departure is before arrival, it's next day
        let depUTC = departureUTC;
        if (depUTC.getTime() < arrivalUTC.getTime()) {
          const nextDay = new Date(baseDate + 'T00:00:00');
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().split('T')[0];
          depUTC = parseDateTimeInTimezone(segment2Departure, nextDayStr, timezone) || depUTC;
        }

        const durationMs = depUTC.getTime() - arrivalUTC.getTime();
        return Math.round(durationMs / (1000 * 60));
      }
    }
  }

  // Fallback to naive calculation
  const arrival = parseDateTime(segment1Arrival, baseDate);
  const departure = parseDateTime(segment2Departure, baseDate);

  if (!arrival || !departure) return 0;

  // Handle day change: if departure is earlier than arrival, it's next day
  let departureDate = departure;
  if (departure.getTime() < arrival.getTime()) {
    departureDate = new Date(departure);
    departureDate.setDate(departureDate.getDate() + 1);
  }

  const durationMs = departureDate.getTime() - arrival.getTime();
  return Math.round(durationMs / (1000 * 60));
}

/**
 * Get all layover durations for an itinerary
 * Returns array of layover durations in minutes
 */
export function getAllLayoverDurations(
  segments: Array<{
    arrivalTime: string;
    departureTime?: string;
    arrivalAirport?: string; // Added for timezone-aware calculation
  }>,
  layovers?: Array<{
    duration?: number | string;
    overnight?: boolean;
  }>,
  baseDate?: string
): number[] {
  const layoverDurations: number[] = [];

  // If we have explicit layover data, use it
  if (layovers && layovers.length > 0) {
    for (const layover of layovers) {
      if (layover.duration) {
        const dur = parseDuration(layover.duration);
        layoverDurations.push(dur);
      } else {
        layoverDurations.push(0);
      }
    }
    return layoverDurations;
  }

  // Otherwise, calculate from segment times
  for (let i = 0; i < segments.length - 1; i++) {
    const seg1 = segments[i];
    const seg2 = segments[i + 1];

    if (seg1.arrivalTime && seg2.departureTime) {
      // Pass the arrival airport code for timezone-aware calculation
      // The layover occurs at the arrival airport of the first segment
      const layoverAirport = seg1.arrivalAirport;
      const layoverDur = calculateLayoverDuration(
        seg1.arrivalTime,
        seg2.departureTime,
        baseDate,
        layoverAirport
      );
      layoverDurations.push(layoverDur);
    } else {
      layoverDurations.push(0);
    }
  }

  return layoverDurations;
}
