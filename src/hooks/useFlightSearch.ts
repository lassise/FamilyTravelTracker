import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreFlights, type ScoredFlight, type FlightResult } from "@/lib/flightScoring";
import type { FlightPreferences } from "@/hooks/useFlightPreferences";
import { toast } from "sonner";

export interface FlightLegSearch {
  legId: string;
  origin: string;
  destination: string;
  date: string;
}

export interface FlightLegResult {
  legId: string;
  flights: ScoredFlight[];
  isLoading: boolean;
  error: string | null;
}

interface PassengerBreakdown {
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
}

interface CacheEntry {
  flights: ScoredFlight[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useFlightSearch = (
  preferences: FlightPreferences,
  passengerBreakdown: PassengerBreakdown,
  cabinClass: string,
  stopsFilter: string
) => {
  const [legResults, setLegResults] = useState<Record<string, FlightLegResult>>({});
  const [isSearching, setIsSearching] = useState(false);
  const cacheRef = useRef<Record<string, CacheEntry>>({});

  // Store round-trip params for sequential search
  const [roundTripParams, setRoundTripParams] = useState<{
    origin: string;
    destination: string;
    departDate: string;
    returnDate: string;
  } | null>(null);

  const passengers =
    passengerBreakdown.adults +
    passengerBreakdown.children +
    passengerBreakdown.infantsInSeat +
    passengerBreakdown.infantsOnLap;

  // Generate cache key
  const getCacheKey = (origin: string, destination: string, date: string) =>
    `${origin}-${destination}-${date}-${cabinClass}-${passengers}-${stopsFilter}`;

  // Check cache
  const getFromCache = (key: string): ScoredFlight[] | null => {
    const entry = cacheRef.current[key];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.flights;
    }
    return null;
  };

  // Set cache
  const setCache = (key: string, flights: ScoredFlight[]) => {
    cacheRef.current[key] = {
      flights,
      timestamp: Date.now(),
    };
  };

  // Search a single leg
  const searchLeg = useCallback(
    async (leg: FlightLegSearch): Promise<ScoredFlight[]> => {
      const cacheKey = getCacheKey(leg.origin, leg.destination, leg.date);
      const cached = getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const effectiveCabinClass = cabinClass === "any" ? null : cabinClass;

      const { data, error } = await supabase.functions.invoke("search-flights", {
        body: {
          origin: leg.origin,
          destination: leg.destination,
          departureDate: leg.date,
          returnDate: null,
          passengers,
          tripType: "oneway",
          cabinClass: effectiveCabinClass,
          alternateAirports: preferences.alternate_airports,
          stopsFilter,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const rawFlights: FlightResult[] = data.flights || [];
      const scored = scoreFlights(rawFlights, preferences, undefined, passengerBreakdown, cabinClass);

      setCache(cacheKey, scored);
      return scored;
    },
    [preferences, passengerBreakdown, cabinClass, stopsFilter, passengers]
  );

  // Search one-way
  const searchOneWay = useCallback(
    async (origin: string, destination: string, date: string) => {
      const legId = "outbound";

      setLegResults((prev) => ({
        ...prev,
        [legId]: { legId, flights: [], isLoading: true, error: null },
      }));

      setIsSearching(true);
      setRoundTripParams(null);

      try {
        const flights = await searchLeg({ legId, origin, destination, date });
        setLegResults((prev) => ({
          ...prev,
          [legId]: { legId, flights, isLoading: false, error: null },
        }));

        if (flights.length === 0) {
          toast.info("No flights found for this route");
        } else {
          toast.success(`Found ${flights.length} flight options`);
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to search flights";
        setLegResults((prev) => ({
          ...prev,
          [legId]: { legId, flights: [], isLoading: false, error: errorMsg },
        }));
        toast.error("Failed to search flights");
      } finally {
        setIsSearching(false);
      }
    },
    [searchLeg]
  );

  // Search round-trip - Sequential: outbound first, return on-demand
  const searchRoundTrip = useCallback(
    async (origin: string, destination: string, departDate: string, returnDate: string) => {
      const outboundId = "outbound";
      const returnId = "return";

      // Store params for later return search
      setRoundTripParams({ origin, destination, departDate, returnDate });

      // Initialize outbound as loading, return as pending (not searched yet)
      setLegResults({
        [outboundId]: { legId: outboundId, flights: [], isLoading: true, error: null },
        [returnId]: { legId: returnId, flights: [], isLoading: false, error: null },
      });

      setIsSearching(true);

      // Search outbound only
      try {
        const outboundFlights = await searchLeg({ 
          legId: outboundId, 
          origin, 
          destination, 
          date: departDate 
        });
        
        setLegResults((prev) => ({
          ...prev,
          [outboundId]: { legId: outboundId, flights: outboundFlights, isLoading: false, error: null },
        }));

        if (outboundFlights.length === 0) {
          toast.info("No outbound flights found");
        } else {
          toast.success(`Found ${outboundFlights.length} outbound options. Select one to see return flights.`);
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to search outbound flights";
        setLegResults((prev) => ({
          ...prev,
          [outboundId]: { legId: outboundId, flights: [], isLoading: false, error: errorMsg },
        }));
        toast.error("Failed to search outbound flights");
      } finally {
        setIsSearching(false);
      }
    },
    [searchLeg]
  );

  // Search return leg (called when outbound is selected)
  const searchReturnLeg = useCallback(
    async () => {
      if (!roundTripParams) return;

      const { origin, destination, returnDate } = roundTripParams;
      const returnId = "return";

      setLegResults((prev) => ({
        ...prev,
        [returnId]: { legId: returnId, flights: [], isLoading: true, error: null },
      }));

      setIsSearching(true);

      try {
        const returnFlights = await searchLeg({ 
          legId: returnId, 
          origin: destination, 
          destination: origin, 
          date: returnDate 
        });
        
        setLegResults((prev) => ({
          ...prev,
          [returnId]: { legId: returnId, flights: returnFlights, isLoading: false, error: null },
        }));

        if (returnFlights.length === 0) {
          toast.info("No return flights found");
        } else {
          toast.success(`Found ${returnFlights.length} return options`);
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to search return flights";
        setLegResults((prev) => ({
          ...prev,
          [returnId]: { legId: returnId, flights: [], isLoading: false, error: errorMsg },
        }));
        toast.error("Failed to search return flights");
      } finally {
        setIsSearching(false);
      }
    },
    [searchLeg, roundTripParams]
  );

  // Search multi-city (parallel with concurrency limit)
  const searchMultiCity = useCallback(
    async (segments: Array<{ origin: string; destination: string; date: string }>) => {
      // Initialize all legs as loading
      const initialResults: Record<string, FlightLegResult> = {};
      segments.forEach((seg, idx) => {
        const legId = `segment-${idx + 1}`;
        initialResults[legId] = { legId, flights: [], isLoading: true, error: null };
      });
      setLegResults(initialResults);

      setIsSearching(true);
      setRoundTripParams(null);

      // Use Promise.allSettled for parallel search with safe error handling
      // Limit concurrency to 3 to avoid edge function timeouts
      const MAX_CONCURRENCY = 3;
      const results: Array<{ legId: string; result: PromiseSettledResult<ScoredFlight[]> }> = [];

      for (let i = 0; i < segments.length; i += MAX_CONCURRENCY) {
        const batch = segments.slice(i, i + MAX_CONCURRENCY);
        const batchResults = await Promise.allSettled(
          batch.map((seg, batchIdx) => {
            const legId = `segment-${i + batchIdx + 1}`;
            return searchLeg({ legId, origin: seg.origin, destination: seg.destination, date: seg.date });
          })
        );

        batchResults.forEach((result, batchIdx) => {
          const legId = `segment-${i + batchIdx + 1}`;
          results.push({ legId, result });
        });
      }

      // Update results
      const updatedResults: Record<string, FlightLegResult> = {};
      let totalFlights = 0;

      results.forEach(({ legId, result }) => {
        if (result.status === "fulfilled") {
          updatedResults[legId] = { legId, flights: result.value, isLoading: false, error: null };
          totalFlights += result.value.length;
        } else {
          updatedResults[legId] = {
            legId,
            flights: [],
            isLoading: false,
            error: result.reason?.message || "Failed to search this leg",
          };
        }
      });

      setLegResults(updatedResults);
      setIsSearching(false);

      if (totalFlights > 0) {
        toast.success(`Found flights for ${results.filter((r) => r.result.status === "fulfilled").length} segments`);
      } else {
        toast.info("No flights found for the selected routes");
      }
    },
    [searchLeg]
  );

  // Retry a specific leg
  const retryLeg = useCallback(
    async (legId: string, origin: string, destination: string, date: string) => {
      setLegResults((prev) => ({
        ...prev,
        [legId]: { legId, flights: [], isLoading: true, error: null },
      }));

      try {
        const flights = await searchLeg({ legId, origin, destination, date });
        setLegResults((prev) => ({
          ...prev,
          [legId]: { legId, flights, isLoading: false, error: null },
        }));
        toast.success(`Found ${flights.length} options for this leg`);
      } catch (err: any) {
        const errorMsg = err.message || "Failed to search flights";
        setLegResults((prev) => ({
          ...prev,
          [legId]: { legId, flights: [], isLoading: false, error: errorMsg },
        }));
        toast.error("Failed to retry search");
      }
    },
    [searchLeg]
  );

  // Clear all results
  const clearResults = useCallback(() => {
    setLegResults({});
    setRoundTripParams(null);
  }, []);

  // Check if return search is pending (for sequential round-trip)
  const isReturnPending = roundTripParams !== null && 
    legResults["return"]?.flights.length === 0 && 
    !legResults["return"]?.isLoading && 
    !legResults["return"]?.error;

  return {
    legResults,
    isSearching,
    searchOneWay,
    searchRoundTrip,
    searchReturnLeg,
    searchMultiCity,
    retryLeg,
    clearResults,
    isReturnPending,
    roundTripParams,
  };
};
