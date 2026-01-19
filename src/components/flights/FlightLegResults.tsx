import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Check,
  Star,
  Zap,
  DollarSign,
  PlaneTakeoff,
  PlaneLanding,
  Clock,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoredFlight } from "@/lib/flightScoring";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FlightLegResultsProps {
  legId: string;
  legLabel: string;
  origin: string;
  destination: string;
  date: string;
  flights: ScoredFlight[];
  isLoading: boolean;
  error: string | null;
  selectedFlightId: string | null;
  onSelectFlight: (flight: ScoredFlight) => void;
  onRetry: () => void;
  isAvoidedAirline: (code: string) => boolean;
  formatTime: (dateTime: string) => string;
  formatDate: (dateTime: string) => string;
}

export const FlightLegResults = ({
  legId,
  legLabel,
  origin,
  destination,
  date,
  flights,
  isLoading,
  error,
  selectedFlightId,
  onSelectFlight,
  onRetry,
  isAvoidedAirline,
  formatTime,
  formatDate,
}: FlightLegResultsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const displayedFlights = showAll ? flights : flights.slice(0, 5);

  // Quick categories
  const bestOverall = flights[0];
  const cheapest = flights.length > 0 ? [...flights].sort((a, b) => a.price - b.price)[0] : null;
  const fastest =
    flights.length > 0
      ? [...flights].sort((a, b) => {
          const aDur = a.itineraries.reduce(
            (sum, it) =>
              sum +
              it.segments.reduce((s, seg) => s + (typeof seg.duration === "number" ? seg.duration : 0), 0),
            0
          );
          const bDur = b.itineraries.reduce(
            (sum, it) =>
              sum +
              it.segments.reduce((s, seg) => s + (typeof seg.duration === "number" ? seg.duration : 0), 0),
            0
          );
          return aDur - bDur;
        })[0]
      : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-4 w-4 animate-spin" />
            {legLabel}: {origin} → {destination}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-destructive" />
            {legLabel}: {origin} → {destination}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry this leg
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (flights.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {legLabel}: {origin} → {destination}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No flights found for this route on {date}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(selectedFlightId ? "border-primary" : "")}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {selectedFlightId ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <PlaneTakeoff className="h-4 w-4" />
                )}
                {legLabel}: {origin} → {destination}
                <Badge variant="secondary" className="text-xs">
                  {flights.length} options
                </Badge>
              </span>
              <div className="flex items-center gap-2">
                {selectedFlightId && (
                  <Badge variant="default" className="text-xs">
                    Selected
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Quick category badges */}
            <div className="flex flex-wrap gap-2">
              {bestOverall && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Star className="h-3 w-3 text-primary" /> Best: ${bestOverall.price}
                </Badge>
              )}
              {cheapest && cheapest.id !== bestOverall?.id && (
                <Badge variant="outline" className="text-xs gap-1">
                  <DollarSign className="h-3 w-3 text-green-500" /> Cheapest: ${cheapest.price}
                </Badge>
              )}
              {fastest && fastest.id !== bestOverall?.id && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" /> Fastest
                </Badge>
              )}
            </div>

            {/* Flight options */}
            {displayedFlights.map((flight, idx) => {
              const firstSeg = flight.itineraries[0]?.segments[0];
              const lastSeg =
                flight.itineraries[0]?.segments[flight.itineraries[0]?.segments.length - 1];
              const stops = (flight.itineraries[0]?.segments.length || 1) - 1;
              const duration = flight.itineraries.reduce(
                (sum, it) =>
                  sum +
                  it.segments.reduce(
                    (s, seg) => s + (typeof seg.duration === "number" ? seg.duration : 0),
                    0
                  ),
                0
              );
              const isSelected = flight.id === selectedFlightId;
              const flightAirline = firstSeg?.airline || "";
              const isAvoided = isAvoidedAirline(flightAirline);

              return (
                <div
                  key={flight.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                    isSelected && "border-primary bg-primary/5",
                    isAvoided && "border-red-500/50 bg-red-50/30 dark:bg-red-950/10"
                  )}
                  onClick={() => onSelectFlight(flight)}
                >
                  {/* Avoided warning */}
                  {isAvoided && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Avoided airline</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Airline and badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {firstSeg?.airline} {firstSeg?.flightNumber}
                        </Badge>
                        {idx === 0 && !isAvoided && (
                          <Badge className="text-[10px] bg-primary">Best Match</Badge>
                        )}
                        {flight.id === cheapest?.id && (
                          <Badge variant="secondary" className="text-[10px]">
                            Cheapest
                          </Badge>
                        )}
                        {flight.id === fastest?.id && (
                          <Badge variant="secondary" className="text-[10px]">
                            Fastest
                          </Badge>
                        )}
                      </div>

                      {/* Times */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{formatTime(firstSeg?.departureTime || "")}</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground">
                            {Math.floor(duration / 60)}h {duration % 60}m
                          </span>
                          <div className="w-12 h-px bg-border relative">
                            {stops > 0 && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {stops === 0 ? "Nonstop" : `${stops} stop`}
                          </span>
                        </div>
                        <span className="font-medium">{formatTime(lastSeg?.arrivalTime || "")}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <span>{firstSeg?.departureAirport}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{lastSeg?.arrivalAirport}</span>
                      </div>
                    </div>

                    {/* Price and select */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">${flight.price}</p>
                      <p className="text-xs text-muted-foreground">Score: {flight.score}</p>
                      {isSelected && (
                        <Badge variant="default" className="mt-1 text-[10px]">
                          <Check className="h-3 w-3 mr-1" /> Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show more button */}
            {flights.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(!showAll);
                }}
              >
                {showAll ? "Show less" : `Show ${flights.length - 5} more options`}
                {showAll ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
