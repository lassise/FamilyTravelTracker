import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Check } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface TravelDatePickerProps {
  startDate: string | null;
  endDate: string | null;
  onSave: (startDate: string | null, endDate: string | null) => void;
  disabled?: boolean;
}

export const TravelDatePicker = ({
  startDate,
  endDate,
  onSave,
  disabled = false,
}: TravelDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    startDate ? parseISO(startDate) : undefined,
  );
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(
    endDate ? parseISO(endDate) : undefined,
  );

  // Sync with external props when popover opens
  useEffect(() => {
    if (open) {
      setLocalStartDate(startDate ? parseISO(startDate) : undefined);
      setLocalEndDate(endDate ? parseISO(endDate) : undefined);
    }
  }, [open, startDate, endDate]);

  const handleDone = () => {
    const formattedStart = localStartDate
      ? format(localStartDate, "yyyy-MM-dd")
      : null;
    const formattedEnd = localEndDate ? format(localEndDate, "yyyy-MM-dd") : null;

    onSave(formattedStart, formattedEnd);
    setOpen(false);
  };

  const handleCancel = () => {
    setLocalStartDate(startDate ? parseISO(startDate) : undefined);
    setLocalEndDate(endDate ? parseISO(endDate) : undefined);
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setLocalStartDate(range?.from);
    setLocalEndDate(range?.to);
  };

  const displayText = () => {
    if (startDate && endDate) {
      return `${format(parseISO(startDate), "MMM d, yyyy")} - ${format(parseISO(endDate), "MMM d, yyyy")}`;
    }
    if (startDate) {
      return format(parseISO(startDate), "MMM d, yyyy");
    }
    return "Pick travel dates";
  };

  const selectedRange: DateRange | undefined =
    localStartDate || localEndDate
      ? { from: localStartDate, to: localEndDate }
      : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !startDate && "text-muted-foreground",
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {displayText()}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 max-h-[85vh] overflow-auto" align="center" side="bottom" sideOffset={8}>
        <div className="p-3 border-b bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-md border border-border bg-background">
              <Label className="text-xs text-muted-foreground block mb-0.5">
                Start Date
              </Label>
              <div className="text-sm font-medium">
                {localStartDate
                  ? format(localStartDate, "MMM d, yyyy")
                  : "Select..."}
              </div>
            </div>

            <div className="p-2 rounded-md border border-border bg-background">
              <Label className="text-xs text-muted-foreground block mb-0.5">
                End Date
              </Label>
              <div className="text-sm font-medium">
                {localEndDate
                  ? format(localEndDate, "MMM d, yyyy")
                  : "Select..."}
              </div>
            </div>
          </div>
        </div>

        <CalendarComponent
          mode="range"
          selected={selectedRange}
          onSelect={handleRangeSelect}
          defaultMonth={localStartDate || localEndDate || new Date()}
          className="pointer-events-auto p-4 scale-110 origin-top"
          numberOfMonths={1}
        />

        <div className="p-3 border-t flex justify-end gap-2 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDone}
            disabled={!localStartDate || !localEndDate}
          >
            <Check className="w-4 h-4 mr-1" />
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

