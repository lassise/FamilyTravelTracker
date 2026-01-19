import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ShoppingCart,
  X,
  ExternalLink,
  PlaneTakeoff,
  PlaneLanding,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoredFlight } from "@/lib/flightScoring";
import { toast } from "sonner";

export interface SelectedFlight {
  legId: string;
  legLabel: string;
  flight: ScoredFlight;
  origin: string;
  destination: string;
  date: string;
}

interface FlightSelectionCartProps {
  tripType: "oneway" | "roundtrip" | "multicity";
  selections: SelectedFlight[];
  onRemoveSelection: (legId: string) => void;
  onChangeSelection: (legId: string) => void;
  onContinueToGoogle: () => void;
  isComplete: boolean;
  totalPrice: number;
  passengerCount: number;
  cabinClass: string;
  isMobile?: boolean;
}

export const FlightSelectionCart = ({
  tripType,
  selections,
  onRemoveSelection,
  onChangeSelection,
  onContinueToGoogle,
  isComplete,
  totalPrice,
  passengerCount,
  cabinClass,
  isMobile = false,
}: FlightSelectionCartProps) => {
  const [checklistCopied, setChecklistCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Generate checklist for matching on Google Flights
  const generateChecklist = () => {
    return selections
      .map((sel) => {
        const seg = sel.flight.itineraries[0]?.segments[0];
        if (!seg) return "";

        const stops = sel.flight.itineraries[0]?.segments.length - 1;
        const duration = sel.flight.itineraries.reduce(
          (sum, it) =>
            sum +
            it.segments.reduce((s, segment) => s + (typeof segment.duration === "number" ? segment.duration : 0), 0),
          0
        );

        return `${sel.legLabel}:
• Airline: ${seg.airline} ${seg.flightNumber || ""}
• Departs: ${formatTime(seg.departureTime)} from ${seg.departureAirport}
• Arrives: ${formatTime(sel.flight.itineraries[0]?.segments[sel.flight.itineraries[0]?.segments.length - 1]?.arrivalTime || "")} at ${sel.flight.itineraries[0]?.segments[sel.flight.itineraries[0]?.segments.length - 1]?.arrivalAirport || sel.destination}
• Stops: ${stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}
• Duration: ${Math.floor(duration / 60)}h ${duration % 60}m
• Price: $${sel.flight.price}`;
      })
      .filter(Boolean)
      .join("\n\n");
  };

  const handleCopyChecklist = () => {
    const checklist = generateChecklist();
    navigator.clipboard.writeText(checklist);
    setChecklistCopied(true);
    toast.success("Checklist copied to clipboard");
    setTimeout(() => setChecklistCopied(false), 2000);
  };

  const getLegRequirements = () => {
    switch (tripType) {
      case "oneway":
        return ["Outbound"];
      case "roundtrip":
        return ["Outbound", "Return"];
      case "multicity":
        // Dynamic based on selections, we'll determine from parent
        const multiCityLabels: string[] = [];
        for (let i = 1; i <= 6; i++) {
          const exists = selections.some((s) => s.legId === `segment-${i}`);
          if (exists || i <= 2) multiCityLabels.push(`Flight ${i}`);
          else break;
        }
        return multiCityLabels;
      default:
        return ["Outbound"];
    }
  };

  const CartContent = () => (
    <div className="space-y-4">
      {/* Selections */}
      {selections.length > 0 ? (
        <div className="space-y-3">
          {selections.map((sel) => {
            const firstSeg = sel.flight.itineraries[0]?.segments[0];
            const lastSeg =
              sel.flight.itineraries[0]?.segments[sel.flight.itineraries[0]?.segments.length - 1];
            const stops = (sel.flight.itineraries[0]?.segments.length || 1) - 1;

            return (
              <Card key={sel.legId} className="border-primary/30 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {sel.legLabel}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onChangeSelection(sel.legId)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onRemoveSelection(sel.legId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span className="font-medium">{sel.origin}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{sel.destination}</span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {firstSeg?.airline} {firstSeg?.flightNumber}
                      </Badge>
                      <span>{stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatTime(firstSeg?.departureTime || "")}</span>
                      <span>→</span>
                      <span>{formatTime(lastSeg?.arrivalTime || "")}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <span className="font-bold text-primary">${sel.flight.price}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No flights selected yet</p>
          <p className="text-xs">Click on a flight to select it</p>
        </div>
      )}

      {/* Summary */}
      {selections.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({passengerCount} traveler{passengerCount > 1 ? "s" : ""})</span>
            <span className="font-bold">${totalPrice.toFixed(0)}</span>
          </div>
          {passengerCount > 1 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Per person</span>
              <span>${(totalPrice / passengerCount).toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Match This Flight Checklist */}
      {selections.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-xs gap-2">
              <Info className="h-3 w-3" />
              Match This Flight Checklist
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-3 bg-muted rounded-md text-xs space-y-2">
              <p className="text-muted-foreground">
                Use this checklist to find the exact same flights on Google Flights:
              </p>
              <div className="font-mono text-[10px] whitespace-pre-wrap bg-background p-2 rounded border max-h-40 overflow-auto">
                {generateChecklist()}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={handleCopyChecklist}
              >
                {checklistCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {checklistCopied ? "Copied!" : "Copy Checklist"}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Continue Button */}
      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!isComplete}
        onClick={onContinueToGoogle}
      >
        Continue to Google Flights
        <ExternalLink className="h-4 w-4" />
      </Button>

      {!isComplete && (
        <p className="text-xs text-center text-muted-foreground">
          {tripType === "oneway" && "Select an outbound flight to continue"}
          {tripType === "roundtrip" && "Select outbound and return flights to continue"}
          {tripType === "multicity" && "Select a flight for each segment to continue"}
        </p>
      )}
    </div>
  );

  // Mobile: Show as a sheet/drawer
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-20 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
            size="icon"
          >
            <ShoppingCart className="h-6 w-6" />
            {selections.length > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                variant="secondary"
              >
                {selections.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selected Flights ({selections.length})
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-4rem)] mt-4">
            <CartContent />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Sticky sidebar
  return (
    <Card className="sticky top-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Selected Flights
                {selections.length > 0 && (
                  <Badge variant="secondary">{selections.length}</Badge>
                )}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <CartContent />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
