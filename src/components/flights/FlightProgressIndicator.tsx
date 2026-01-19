import { Check, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  isCompleted: boolean;
  isActive: boolean;
}

interface FlightProgressIndicatorProps {
  tripType: "roundtrip" | "oneway" | "multicity";
  confirmedLegs: string[];
  activeLegTab: string;
  allLegsComplete: boolean;
  multiCitySegmentCount?: number;
}

export const FlightProgressIndicator = ({
  tripType,
  confirmedLegs,
  activeLegTab,
  allLegsComplete,
  multiCitySegmentCount = 0,
}: FlightProgressIndicatorProps) => {
  const getSteps = (): Step[] => {
    if (tripType === "oneway") {
      return [
        {
          id: "outbound",
          label: "Select Flight",
          isCompleted: confirmedLegs.includes("outbound"),
          isActive: activeLegTab === "outbound" && !confirmedLegs.includes("outbound"),
        },
        {
          id: "book",
          label: "Book",
          isCompleted: false,
          isActive: allLegsComplete,
        },
      ];
    } else if (tripType === "roundtrip") {
      return [
        {
          id: "outbound",
          label: "Departure",
          isCompleted: confirmedLegs.includes("outbound"),
          isActive: activeLegTab === "outbound" && !confirmedLegs.includes("outbound"),
        },
        {
          id: "return",
          label: "Return",
          isCompleted: confirmedLegs.includes("return"),
          isActive: activeLegTab === "return" && !confirmedLegs.includes("return"),
        },
        {
          id: "book",
          label: "Book",
          isCompleted: false,
          isActive: allLegsComplete,
        },
      ];
    } else {
      const segmentSteps: Step[] = [];
      for (let i = 1; i <= multiCitySegmentCount; i++) {
        const segmentId = `segment-${i}`;
        segmentSteps.push({
          id: segmentId,
          label: `Flight ${i}`,
          isCompleted: confirmedLegs.includes(segmentId),
          isActive: activeLegTab === segmentId && !confirmedLegs.includes(segmentId),
        });
      }
      segmentSteps.push({
        id: "book",
        label: "Book",
        isCompleted: false,
        isActive: allLegsComplete,
      });
      return segmentSteps;
    }
  };

  const steps = getSteps();

  return (
    <div className="w-full bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  step.isCompleted && "bg-primary border-primary text-primary-foreground",
                  step.isActive && !step.isCompleted && "border-primary bg-primary/10 text-primary",
                  !step.isCompleted && !step.isActive && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  step.isCompleted && "text-primary",
                  step.isActive && !step.isCompleted && "text-primary font-semibold",
                  !step.isCompleted && !step.isActive && "text-muted-foreground"
                )}
              >
                {step.label}
                {step.isCompleted && " ✓"}
              </span>
            </div>

            {/* Arrow between steps */}
            {index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-3 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
