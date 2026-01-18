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
import { PlannerModeStep, type ClientInfo } from "./wizard/PlannerModeStep";
import { ContextStep } from "./wizard/ContextStep";
import { useTravelProfiles } from "@/hooks/useTravelProfiles";

export interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  hasDates: boolean;
  hasLodging: boolean;
  travelingWithKids: boolean;
  kidsAges: number[];
  interests: string[];
  pacePreference: string;
  budgetLevel: string;
  lodgingLocation: string;
  napSchedule: string;
  strollerNeeds: boolean;
  tripPurpose: string; // "leisure" | "business" | "mixed"
  // New fields for planner mode
  plannerMode: 'personal' | 'planner';
  clientInfo: ClientInfo;
  extraContext: string;
  // Booking preferences
  providerPreferences: string[];
  // Accessibility
  needsWheelchairAccess: boolean;
  hasStroller: boolean;
}

const STEPS = [
  { id: 1, title: "Mode", description: "Who's this for?" },
  { id: 2, title: "Basics", description: "Where & when" },
  { id: 3, title: "Kids", description: "Ages & needs" },
  { id: 4, title: "Interests", description: "What you love" },
  { id: 5, title: "Preferences", description: "Your style" },
  { id: 6, title: "Context", description: "Extra details" },
  { id: 7, title: "Generate", description: "Create itinerary" },
];

const TripWizard = () => {
  const navigate = useNavigate();
  const { createTrip } = useTrips();
  const { profiles, activeProfile } = useTravelProfiles();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState<TripFormData>({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    hasDates: true,
    hasLodging: false,
    travelingWithKids: true,
    kidsAges: [],
    interests: [],
    pacePreference: "moderate",
    budgetLevel: "moderate",
    lodgingLocation: "",
    napSchedule: "",
    strollerNeeds: false,
    tripPurpose: "leisure",
    // New fields
    plannerMode: 'personal',
    clientInfo: {
      numAdults: 2,
      numKids: 0,
      kidsAges: [],
      homeAirport: '',
      budgetRange: 'moderate',
      profileId: null,
    },
    extraContext: "",
    providerPreferences: [],
    // Accessibility
    needsWheelchairAccess: false,
    hasStroller: false,
  });

  const updateFormData = (updates: Partial<TripFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Mode step - always can proceed
        return true;
      case 2:
        // Destination required, dates only if they said they have them
        if (!formData.destination) return false;
        if (formData.hasDates && (!formData.startDate || !formData.endDate)) return false;
        return true;
      case 3:
        // Kids ages only required if traveling with kids
        if (formData.travelingWithKids && formData.kidsAges.length === 0) return false;
        return true;
      case 4:
        return formData.interests.length > 0;
      case 5:
        return formData.pacePreference && formData.budgetLevel;
      case 6:
        // Context step is optional
        return true;
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
      
      // Determine kids ages based on mode
      const effectiveKidsAges = formData.plannerMode === 'planner' 
        ? formData.clientInfo.kidsAges 
        : formData.kidsAges;
      
      const effectiveBudget = formData.plannerMode === 'planner'
        ? formData.clientInfo.budgetRange
        : formData.budgetLevel;
      
      // Get active profile preferences if available
      const selectedProfile = formData.plannerMode === 'planner' && formData.clientInfo.profileId
        ? profiles.find(p => p.id === formData.clientInfo.profileId)
        : activeProfile;
      
      // First create the trip in the database
      const { data: trip, error: tripError } = await createTrip({
        title: tripTitle,
        destination: formData.destination,
        start_date: formData.startDate,
        end_date: formData.endDate,
        kids_ages: effectiveKidsAges,
        interests: formData.interests,
        pace_preference: formData.pacePreference,
        status: 'planning',
        has_lodging_booked: formData.hasLodging,
        provider_preferences: formData.providerPreferences,
        needs_wheelchair_access: formData.needsWheelchairAccess,
        has_stroller: formData.hasStroller || formData.strollerNeeds,
      });

      if (tripError || !trip) {
        throw new Error(tripError?.message || 'Failed to create trip');
      }

      toast.info("Generating your personalized itinerary...");

      // Call the edge function to generate itinerary with enhanced data
      const { data: itineraryData, error: itineraryError } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          destination: formData.destination,
          startDate: formData.startDate,
          endDate: formData.endDate,
          kidsAges: formData.travelingWithKids ? effectiveKidsAges : [],
          interests: formData.interests,
          pacePreference: selectedProfile?.pace || formData.pacePreference,
          budgetLevel: effectiveBudget,
          lodgingLocation: formData.lodgingLocation,
          napSchedule: formData.travelingWithKids ? formData.napSchedule : "",
          strollerNeeds: formData.travelingWithKids ? formData.strollerNeeds : false,
          tripPurpose: formData.tripPurpose,
          hasKids: (formData.travelingWithKids && effectiveKidsAges.length > 0) || 
                   (formData.plannerMode === 'planner' && formData.clientInfo.numKids > 0),
          // New fields
          plannerMode: formData.plannerMode,
          extraContext: formData.extraContext,
          clientInfo: formData.plannerMode === 'planner' ? formData.clientInfo : null,
          profilePreferences: selectedProfile ? {
            pace: selectedProfile.pace,
            budgetLevel: selectedProfile.budget_level,
            kidFriendlyPriority: selectedProfile.kid_friendly_priority,
            preferNonstop: selectedProfile.prefer_nonstop,
            maxStops: selectedProfile.max_stops,
          } : null,
          // Booking preferences
          hasLodgingBooked: formData.hasLodging,
          providerPreferences: formData.providerPreferences,
          // Accessibility preferences
          needsWheelchairAccess: formData.needsWheelchairAccess,
          hasStroller: formData.hasStroller || formData.strollerNeeds,
        },
      });

      if (itineraryError) {
        // Handle specific error codes with user-friendly messages
        const errorData = itineraryError.message ? JSON.parse(itineraryError.message) : {};
        const errorCode = errorData.code;
        
        switch (errorCode) {
          case 'RATE_LIMITED':
          case 'AI_RATE_LIMITED':
            toast.error("You're making requests too quickly. Please wait a moment and try again.");
            break;
          case 'CREDITS_EXHAUSTED':
            toast.error("AI credits are exhausted. Please add credits to continue.");
            break;
          case 'VALIDATION_ERROR':
            toast.error("Please check your trip details: " + (errorData.details?.[0] || "Invalid input"));
            break;
          default:
            toast.error(errorData.error || "Failed to generate itinerary. Please try again.");
        }
        throw new Error(errorData.error || 'Generation failed');
      }

      const { itinerary, meta } = itineraryData;
      
      // Check if any days need regeneration
      if (meta?.daysNeedingRegeneration?.length > 0) {
        toast.warning(`Generated itinerary with ${meta.daysNeedingRegeneration.length} day(s) that may need regeneration.`);
      }

      // Save the itinerary days and items to the database
      // Use exact dates from formData to ensure date integrity
      if (itinerary?.days) {
        for (const day of itinerary.days) {
          // Calculate exact date based on user's start date
          const dayDate = new Date(formData.startDate);
          dayDate.setDate(dayDate.getDate() + day.dayNumber - 1);
          const exactDate = dayDate.toISOString().split('T')[0];

          const { data: savedDay, error: dayError } = await supabase
            .from('itinerary_days')
            .insert({
              trip_id: trip.id,
              day_number: day.dayNumber,
              date: exactDate, // Always use calculated date, never AI's date
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

          // Save activities for this day with new booking fields
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
              // New booking fields
              rating: activity.rating,
              review_count: activity.reviewCount,
              booking_url: activity.bookingUrl,
              provider_type: activity.providerType,
              why_it_fits: activity.whyItFits,
              best_time_to_visit: activity.bestTimeToVisit,
              crowd_level: activity.crowdLevel,
              seasonal_notes: activity.seasonalNotes,
              transport_mode: activity.transportMode,
              transport_booking_url: activity.transportBookingUrl,
              transport_station_notes: activity.transportStationNotes,
              latitude: activity.latitude,
              longitude: activity.longitude,
              // Distance and accessibility fields
              distance_from_previous: activity.distanceFromPrevious,
              distance_unit: activity.distanceUnit || 'km',
              travel_time_minutes: activity.travelTimeMinutes,
              recommended_transit_mode: activity.recommendedTransitMode,
              transit_details: activity.transitDetails,
              accessibility_notes: activity.accessibilityNotes,
              is_wheelchair_accessible: activity.isWheelchairAccessible,
              stroller_notes: activity.strollerNotes,
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

      // Save lodging suggestions if provided and lodging not booked
      if (itinerary?.lodgingSuggestions && !formData.hasLodging) {
        const lodgingToInsert = itinerary.lodgingSuggestions.map((lodging: any) => ({
          trip_id: trip.id,
          name: lodging.name,
          lodging_type: lodging.lodgingType,
          address: lodging.address,
          description: lodging.description,
          price_per_night: lodging.pricePerNight,
          currency: lodging.currency,
          rating: lodging.rating,
          review_count: lodging.reviewCount,
          booking_url: lodging.bookingUrl,
          is_kid_friendly: lodging.isKidFriendly,
          amenities: lodging.amenities,
          distance_from_center: lodging.distanceFromCenter,
          why_recommended: lodging.whyRecommended,
          latitude: lodging.latitude,
          longitude: lodging.longitude,
        }));

        const { error: lodgingError } = await supabase
          .from('trip_lodging_suggestions')
          .insert(lodgingToInsert);

        if (lodgingError) {
          console.error('Error saving lodging suggestions:', lodgingError);
        }
      }

      // Save train segments if provided
      if (itinerary?.trainSegments) {
        const trainToInsert = itinerary.trainSegments.map((train: any) => ({
          trip_id: trip.id,
          origin_city: train.originCity,
          origin_station: train.originStation,
          origin_station_alternatives: train.originStationAlternatives,
          destination_city: train.destinationCity,
          destination_station: train.destinationStation,
          destination_station_alternatives: train.destinationStationAlternatives,
          departure_date: train.departureDate,
          departure_time: train.departureTime,
          arrival_time: train.arrivalTime,
          duration_minutes: train.durationMinutes,
          train_type: train.trainType,
          booking_url: train.bookingUrl,
          price_estimate: train.priceEstimate,
          currency: train.currency,
          station_guidance: train.stationGuidance,
          station_warning: train.stationWarning,
          itinerary_day_id: train.itineraryDayId,
        }));

        const { error: trainError } = await supabase
          .from('trip_train_segments')
          .insert(trainToInsert);

        if (trainError) {
          console.error('Error saving train segments:', trainError);
        }
      }

      toast.success("Itinerary generated successfully!");
      navigate(`/trips/${trip.id}`);
      
    } catch (error: any) {
      console.error('Error generating itinerary:', error);
      // Error already shown via toast above for known errors
      if (!error.message?.includes('Generation failed')) {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PlannerModeStep 
            mode={formData.plannerMode}
            clientInfo={formData.clientInfo}
            onModeChange={(mode) => updateFormData({ plannerMode: mode })}
            onClientInfoChange={(clientInfo) => updateFormData({ clientInfo })}
          />
        );
      case 2:
        return <TripBasicsStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <KidsStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <InterestsStep formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <PreferencesStep formData={formData} updateFormData={updateFormData} />;
      case 6:
        return (
          <ContextStep 
            extraContext={formData.extraContext}
            onChange={(value) => updateFormData({ extraContext: value })}
          />
        );
      case 7:
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