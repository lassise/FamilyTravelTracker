
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrips } from "@/hooks/useTrips";
import { useTripLegs } from "@/hooks/useTripLegs";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { DateRange } from "react-day-picker";

const SimpleTripPlanner = () => {
    const navigate = useNavigate();
    const { createTrip } = useTrips();
    const { createLegs } = useTripLegs();

    const [destination, setDestination] = useState("");
    const [interests, setInterests] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!destination || !dateRange?.from || !dateRange?.to) {
            toast.error("Please fill in destination and dates.");
            return;
        }

        setIsGenerating(true);
        try {
            const startDate = format(dateRange.from, 'yyyy-MM-dd');
            const endDate = format(dateRange.to, 'yyyy-MM-dd');
            const interestList = interests.split(',').map(i => i.trim()).filter(Boolean);

            // 1. Create Trip
            const { data: trip, error: tripError } = await createTrip({
                title: `Trip to ${destination}`,
                destination: destination,
                start_date: startDate,
                end_date: endDate,
                status: 'planning',
                interests: interestList,
                kids_ages: [], // Default empty for MVP
            });

            if (tripError || !trip) throw new Error(tripError?.message || "Failed to create trip");

            // 2. Create Leg
            const { error: legError } = await createLegs([{
                trip_id: trip.id,
                country_name: destination, // Assuming simple 1 country/city for now
                start_date: startDate,
                end_date: endDate,
                order_index: 0
            }]);

            if (legError) console.error("Leg error:", legError); // non-blocking

            toast.info("Generative AI is building your itinerary...");

            // 3. Generate Itinerary
            const { data: itineraryData, error: itineraryError } = await supabase.functions.invoke('generate-itinerary', {
                body: {
                    destination: destination,
                    startDate: startDate,
                    endDate: endDate,
                    tripLegs: [{
                        country_name: destination,
                        start_date: startDate,
                        end_date: endDate,
                        order: 0
                    }],
                    interests: interestList,
                    kidsAges: [],
                    transportMode: 'car', // Default
                    pacePreference: 'moderate', // Default
                    budgetLevel: 'moderate', // Default
                }
            });

            if (itineraryError) throw itineraryError;

            const { itinerary } = itineraryData;

            // 4. Save Itinerary Data (Days & Items)
            if (itinerary?.days) {
                for (const day of itinerary.days) {
                    const dayDate = new Date(startDate);
                    dayDate.setDate(dayDate.getDate() + day.dayNumber - 1);

                    const { data: savedDay, error: dayError } = await supabase
                        .from('itinerary_days')
                        .insert({
                            trip_id: trip.id,
                            day_number: day.dayNumber,
                            date: dayDate.toISOString().split('T')[0],
                            title: day.title,
                            notes: day.notes
                        })
                        .select()
                        .single();

                    if (dayError) {
                        console.error("Error saving day", dayError);
                        continue;
                    }

                    if (day.activities && savedDay) {
                        const items = day.activities.map((act: any, idx: number) => ({
                            itinerary_day_id: savedDay.id,
                            sort_order: idx,
                            title: act.title,
                            description: act.description,
                            start_time: act.startTime,
                            end_time: act.endTime,
                            location_name: act.locationName,
                            category: act.category,
                            duration_minutes: act.durationMinutes,
                            cost_estimate: act.costEstimate
                        }));

                        await supabase.from('itinerary_items').insert(items);
                    }
                }
            }

            toast.success("Itinerary generated!");
            navigate(`/trips/${trip.id}`);

        } catch (error: any) {
            console.error("Generation error:", error);
            toast.error(error.message || "Failed to generate itinerary");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Button variant="ghost" className="mb-4" onClick={() => navigate("/trips/new")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">Simple AI Planner (Beta)</h1>
                        <p className="text-muted-foreground">Quickly generate a trip to test our AI engine.</p>
                    </div>

                    <div className="space-y-4 rounded-xl border p-6 bg-card">
                        <div className="space-y-2">
                            <Label>Where to?</Label>
                            <Input
                                placeholder="e.g. Paris, Tokyo, New York"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label>When?</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Interests (Optional)</Label>
                            <Textarea
                                placeholder="e.g. History, Food, Hiking, Art"
                                value={interests}
                                onChange={(e) => setInterests(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Magic...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Itinerary
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default SimpleTripPlanner;
