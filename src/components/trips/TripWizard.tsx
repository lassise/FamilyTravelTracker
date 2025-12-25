import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTrips } from "@/hooks/useTrips";
import { supabase } from "@/integrations/supabase/client";
import { TripBasicsStep } from "./wizard/TripBasicsStep";
import { KidsStep } from "./wizard/KidsStep";
import { InterestsStep } from "./wizard/InterestsStep";
import { PreferencesStep } from "./wizard/PreferencesStep";
import { ReviewStep } from "./wizard/ReviewStep";

export interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  kidsAges: number[];
  interests: string[];
  pacePreference: string;
  budgetLevel: string;
  lodgingLocation: string;
  napSchedule: string;
  strollerNeeds: boolean;
}

const STEPS = [
  { id: 1, title: "Basics", description: "Where & when" },
  { id: 2, title: "Kids", description: "Ages & needs" },
  { id: 3, title: "Interests", description: "What you love" },
  { id: 4, title: "Preferences", description: "Your style" },
  { id: 5, title: "Generate", description: "Create itinerary" },
];

const TripWizard = () => {
  const navigate = useNavigate();
  const { createTrip } = useTrips();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState<TripFormData>({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    kidsAges: [],
    interests: [],
    pacePreference: "balanced",
    budgetLevel: "moderate",
    lodgingLocation: "",
    napSchedule: "",
    strollerNeeds: false,
  });

  const updateFormData = (updates: Partial<TripFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.destination && formData.startDate && formData.endDate;
      case 2:
        return formData.kidsAges.length > 0;
      case 3:
        return formData.interests.length > 0;
      case 4:
        return formData.pacePreference && formData.budgetLevel;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Generate title if not provided
      const tripTitle = formData.title || `${formData.destination} Family Trip`;
      
      // First create the trip in the database
      const { data: trip, error: tripError } = await createTrip({
        title: tripTitle,
        destination: formData.destination,
        start_date: formData.startDate,
        end_date: formData.endDate,
        kids_ages: formData.kidsAges,
        interests: formData.interests,
        pace_preference: formData.pacePreference,
        status: 'planning',
      });

      if (tripError || !trip) {
        throw new Error(tripError?.message || 'Failed to create trip');
      }

      toast.info("Generating your personalized itinerary...");

      // Call the edge function to generate itinerary
      const { data: itineraryData, error: itineraryError } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          destination: formData.destination,
          startDate: formData.startDate,
          endDate: formData.endDate,
          kidsAges: formData.kidsAges,
          interests: formData.interests,
          pacePreference: formData.pacePreference,
          budgetLevel: formData.budgetLevel,
          lodgingLocation: formData.lodgingLocation,
          napSchedule: formData.napSchedule,
          strollerNeeds: formData.strollerNeeds,
        },
      });

      if (itineraryError) {
        throw itineraryError;
      }

      const { itinerary } = itineraryData;

      // Save the itinerary days and items to the database
      if (itinerary?.days) {
        for (const day of itinerary.days) {
          const dayDate = new Date(formData.startDate);
          dayDate.setDate(dayDate.getDate() + day.dayNumber - 1);

          const { data: savedDay, error: dayError } = await supabase
            .from('itinerary_days')
            .insert({
              trip_id: trip.id,
              day_number: day.dayNumber,
              date: dayDate.toISOString().split('T')[0],
              title: day.title,
              notes: day.notes,
              weather_notes: day.weather_notes,
              plan_b: day.planB,
            })
            .select()
            .single();

          if (dayError) {
            console.error('Error saving day:', dayError);
            continue;
          }

          // Save activities for this day
          if (day.activities && savedDay) {
            const itemsToInsert = day.activities.map((activity: any, index: number) => ({
              itinerary_day_id: savedDay.id,
              sort_order: index,
              time_slot: activity.timeSlot,
              start_time: activity.startTime,
              end_time: activity.endTime,
              title: activity.title,
              description: activity.description,
              location_name: activity.locationName,
              location_address: activity.locationAddress,
              category: activity.category,
              duration_minutes: activity.durationMinutes,
              cost_estimate: activity.costEstimate,
              is_kid_friendly: activity.isKidFriendly,
              is_stroller_friendly: activity.isStrollerFriendly,
              requires_reservation: activity.requiresReservation,
              reservation_info: activity.reservationInfo,
            }));

            const { error: itemsError } = await supabase
              .from('itinerary_items')
              .insert(itemsToInsert);

            if (itemsError) {
              console.error('Error saving items:', itemsError);
            }
          }
        }
      }

      toast.success("Itinerary generated successfully!");
      navigate(`/trips/${trip.id}`);
      
    } catch (error: any) {
      console.error('Error generating itinerary:', error);
      toast.error(error.message || "Failed to generate itinerary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TripBasicsStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <KidsStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <InterestsStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <PreferencesStep formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`text-center flex-1 ${
                step.id === currentStep
                  ? "text-primary font-medium"
                  : step.id < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              <div className="text-xs sm:text-sm">{step.title}</div>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? () => navigate("/trips") : handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Itinerary
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TripWizard;
