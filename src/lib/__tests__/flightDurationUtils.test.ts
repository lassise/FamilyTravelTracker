/**
 * Tests for flight duration calculation utilities
 * 
 * Validates that total trip duration correctly includes:
 * - All flight segments
 * - All layovers between segments
 * - Day changes (overnight, +1 day)
 * - Multiple layovers (3+ segments)
 */

import {
  calculateTotalDuration,
  calculateTotalDurationBySum,
  getAllLayoverDurations,
  calculateLayoverDuration
} from '../flightDurationUtils';
import { describe, it, expect } from 'vitest';

describe('Flight Duration Calculation', () => {
  const baseDate = '2026-01-24';

  describe('Direct flight (0 layovers)', () => {
    it('should calculate duration for nonstop flight', () => {
      const segments = [
        {
          departureTime: '2026-01-24T08:00:00',
          arrivalTime: '2026-01-24T14:30:00',
          duration: 390 // 6h 30m in minutes
        }
      ];

      const duration = calculateTotalDuration(segments, [], baseDate);

      // Should be approximately 6h 30m = 390 minutes
      expect(duration).toBeGreaterThan(380);
      expect(duration).toBeLessThan(400);
    });
  });

  describe('1 layover (2 segments)', () => {
    it('should include layover time in total duration', () => {
      const segments = [
        {
          departureTime: '2026-01-24T08:00:00',
          arrivalTime: '2026-01-24T12:00:00',
          duration: 240 // 4 hours
        },
        {
          departureTime: '2026-01-24T14:00:00', // 2 hour layover
          arrivalTime: '2026-01-24T18:30:00',
          duration: 270 // 4.5 hours
        }
      ];

      const layovers = [
        { duration: 120, overnight: false } // 2 hour layover
      ];

      const duration = calculateTotalDuration(segments, layovers, baseDate);

      // Should be: 4h + 2h layover + 4.5h = 10.5h = 630 minutes
      expect(duration).toBeGreaterThan(620);
      expect(duration).toBeLessThan(640);
    });
  });

  describe('2 layovers (3 segments)', () => {
    it('should include all segments and all layovers', () => {
      const segments = [
        {
          departureTime: '2026-01-24T08:00:00',
          arrivalTime: '2026-01-24T11:00:00',
          duration: 180 // 3 hours
        },
        {
          departureTime: '2026-01-24T13:00:00', // 2 hour layover
          arrivalTime: '2026-01-24T16:00:00',
          duration: 180 // 3 hours
        },
        {
          departureTime: '2026-01-24T18:00:00', // 2 hour layover
          arrivalTime: '2026-01-24T22:00:00',
          duration: 240 // 4 hours
        }
      ];

      const layovers = [
        { duration: 120, overnight: false }, // 2 hour layover
        { duration: 120, overnight: false }  // 2 hour layover
      ];

      const duration = calculateTotalDuration(segments, layovers, baseDate);

      // Should be: 3h + 2h + 3h + 2h + 4h = 14h = 840 minutes
      expect(duration).toBeGreaterThan(830);
      expect(duration).toBeLessThan(850);
    });
  });

  describe('3+ layovers (4+ segments)', () => {
    it('should handle flights with 3 or more layovers', () => {
      const segments = [
        {
          departureTime: '2026-01-24T06:00:00',
          arrivalTime: '2026-01-24T09:00:00',
          duration: 180 // 3 hours
        },
        {
          departureTime: '2026-01-24T11:00:00', // 2 hour layover
          arrivalTime: '2026-01-24T14:00:00',
          duration: 180 // 3 hours
        },
        {
          departureTime: '2026-01-24T16:00:00', // 2 hour layover
          arrivalTime: '2026-01-24T19:00:00',
          duration: 180 // 3 hours
        },
        {
          departureTime: '2026-01-24T21:00:00', // 2 hour layover
          arrivalTime: '2026-01-25T02:00:00', // Next day
          duration: 300 // 5 hours
        }
      ];

      const layovers = [
        { duration: 120, overnight: false },
        { duration: 120, overnight: false },
        { duration: 120, overnight: true } // Overnight layover
      ];

      const duration = calculateTotalDuration(segments, layovers, baseDate);

      // Should be: 3h + 2h + 3h + 2h + 3h + 2h + 5h = 20h = 1200 minutes
      // Plus day change handling
      expect(duration).toBeGreaterThan(1190);
      expect(duration).toBeLessThan(1220);
    });
  });

  describe('Overnight/+1 day handling', () => {
    it('should correctly handle overnight flights', () => {
      const segments = [
        {
          departureTime: '2026-01-24T22:00:00',
          arrivalTime: '2026-01-25T08:00:00', // Next day
          duration: 600,
          overnight: true
        }
      ];

      const duration = calculateTotalDuration(segments, [], baseDate);

      // Should be approximately 10 hours (overnight flight)
      expect(duration).toBeGreaterThan(590);
      expect(duration).toBeLessThan(610);
    });

    it('should handle overnight layovers', () => {
      const segments = [
        {
          departureTime: '2026-01-24T20:00:00',
          arrivalTime: '2026-01-24T23:00:00',
          duration: 180
        },
        {
          departureTime: '2026-01-25T10:00:00', // Next day after overnight layover
          arrivalTime: '2026-01-25T14:00:00',
          duration: 240
        }
      ];

      const layovers = [
        { duration: 660, overnight: true } // 11 hour overnight layover
      ];

      const duration = calculateTotalDuration(segments, layovers, baseDate);

      // Should be: 3h + 11h layover + 4h = 18h = 1080 minutes
      expect(duration).toBeGreaterThan(1070);
      expect(duration).toBeLessThan(1090);
    });
  });

  describe('Mixed airlines', () => {
    it('should calculate duration correctly for flights with different airlines', () => {
      const segments = [
        {
          departureTime: '2026-01-24T08:00:00',
          arrivalTime: '2026-01-24T12:00:00',
          duration: 240,
          airline: 'American Airlines'
        },
        {
          departureTime: '2026-01-24T14:00:00',
          arrivalTime: '2026-01-24T18:00:00',
          duration: 240,
          airline: 'United Airlines'
        },
        {
          departureTime: '2026-01-24T20:00:00',
          arrivalTime: '2026-01-25T02:00:00',
          duration: 360,
          airline: 'Delta'
        }
      ];

      const layovers = [
        { duration: 120 },
        { duration: 120 }
      ];

      const duration = calculateTotalDuration(segments, layovers, baseDate);

      // Should include all segments and layovers regardless of airline
      expect(duration).toBeGreaterThan(1070); // 4h + 2h + 4h + 2h + 6h = 18h
      expect(duration).toBeLessThan(1090);
    });
  });

  describe('Fallback calculation by sum', () => {
    it('should sum all segments and layovers when datetime calculation fails', () => {
      const segments = [
        { duration: 180 }, // 3 hours
        { duration: 240 }, // 4 hours
        { duration: 300 }  // 5 hours
      ];

      const layovers = [
        { duration: 120 }, // 2 hours
        { duration: 90 }  // 1.5 hours
      ];

      const duration = calculateTotalDurationBySum(segments, layovers);

      // Should be: 180 + 240 + 300 + 120 + 90 = 930 minutes
      expect(duration).toBe(930);
    });
  });

  describe('Validation', () => {
    it('should return null for empty segments', () => {
      const duration = calculateTotalDuration([], [], baseDate);
      expect(duration).toBeNull();
    });

    it('should handle missing times gracefully', () => {
      const segments = [
        {
          departureTime: '',
          arrivalTime: '',
          duration: 180
        }
      ];

      const duration = calculateTotalDuration(segments, [], baseDate);

      // Should fallback to sum method
      expect(duration).toBeGreaterThan(0);
    });
  });
});
