/**
 * Analytics Utilities for accurate travel statistics
 */

import { differenceInDays, parseISO, eachDayOfInterval, isValid } from 'date-fns';

export interface TripDateRange {
    start_date: string | null;
    end_date: string | null;
}

/**
 * Calculate total unique days traveled across all trips
 * Handles overlapping trips correctly by counting each calendar day only once
 * 
 * @param trips - Array of trips with start and end dates
 * @returns Total number of unique days traveled
 */
export function calculateUniqueDaysTraveled(trips: TripDateRange[]): number {
    if (trips.length === 0) return 0;

    const allDates = new Set<string>();

    for (const trip of trips) {
        if (!trip.start_date || !trip.end_date) continue;

        try {
            const start = parseISO(trip.start_date);
            const end = parseISO(trip.end_date);

            // Validate dates
            if (!isValid(start) || !isValid(end) || start > end) {
                console.warn(`Invalid date range for trip: ${trip.start_date} to ${trip.end_date}`);
                continue;
            }

            // Get all days in the trip range
            const daysInTrip = eachDayOfInterval({ start, end });

            // Add each day to the set (format as YYYY-MM-DD for deduplication)
            daysInTrip.forEach(day => {
                allDates.add(day.toISOString().split('T')[0]);
            });
        } catch (error) {
            console.error(`Error processing trip dates:`, error);
            continue;
        }
    }

    return allDates.size;
}

/**
 * Calculate total days by simple sum (may include overlaps)
 * Useful for comparison or when overlaps are intentional
 */
export function calculateTotalDaysSum(trips: TripDateRange[]): number {
    return trips.reduce((sum, trip) => {
        if (!trip.start_date || !trip.end_date) return sum;

        try {
            const start = parseISO(trip.start_date);
            const end = parseISO(trip.end_date);

            if (!isValid(start) || !isValid(end) || start > end) {
                return sum;
            }

            const days = differenceInDays(end, start) + 1; // +1 to include both start and end
            return sum + days;
        } catch {
            return sum;
        }
    }, 0);
}

/**
 * Detect overlapping trips
 * @returns Array of trip pairs that overlap
 */
export function detectOverlappingTrips<T extends TripDateRange & { id?: string; title?: string }>(
    trips: T[]
): Array<{ trip1: T; trip2: T; overlapDays: number }> {
    const overlaps: Array<{ trip1: T; trip2: T; overlapDays: number }> = [];

    for (let i = 0; i < trips.length; i++) {
        for (let j = i + 1; j < trips.length; j++) {
            const trip1 = trips[i];
            const trip2 = trips[j];

            if (!trip1.start_date || !trip1.end_date || !trip2.start_date || !trip2.end_date) {
                continue;
            }

            try {
                const start1 = parseISO(trip1.start_date);
                const end1 = parseISO(trip1.end_date);
                const start2 = parseISO(trip2.start_date);
                const end2 = parseISO(trip2.end_date);

                // Check if trips overlap
                const hasOverlap = start1 <= end2 && start2 <= end1;

                if (hasOverlap) {
                    // Calculate overlap days
                    const overlapStart = start1 > start2 ? start1 : start2;
                    const overlapEnd = end1 < end2 ? end1 : end2;
                    const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;

                    overlaps.push({
                        trip1,
                        trip2,
                        overlapDays,
                    });
                }
            } catch (error) {
                console.error('Error detecting overlap:', error);
                continue;
            }
        }
    }

    return overlaps;
}
