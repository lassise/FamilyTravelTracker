import { Badge } from "@/components/ui/badge";
import { TripFormData } from "../TripWizard";
import { 
  MapPin, 
  Calendar, 
  Baby, 
  Heart, 
  Gauge, 
  DollarSign,
  Home,
  Clock,
  ShoppingCart
} from "lucide-react";

interface ReviewStepProps {
  formData: TripFormData;
}

const INTEREST_LABELS: Record<string, string> = {
  "nature": "Nature & Outdoors",
  "culture": "Culture & History",
  "theme-parks": "Theme Parks",
  "beaches": "Beaches & Water",
  "museums": "Museums",
  "food": "Food & Dining",
  "sightseeing": "Sightseeing",
  "entertainment": "Entertainment",
  "shopping": "Shopping",
  "walking": "Walking Tours",
  "arts": "Arts & Crafts",
  "playgrounds": "Playgrounds",
  "golf": "Golf",
};

const NAP_LABELS: Record<string, string> = {
  "morning": "Morning nap (9-11am)",
  "afternoon": "Afternoon nap (1-3pm)",
  "both": "Morning & afternoon naps",
  "flexible": "Flexible napping",
  "none": "No naps needed",
};

export const ReviewStep = ({ formData }: ReviewStepProps) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTripDuration = () => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h3 className="text-xl font-semibold">
          {formData.title || `${formData.destination} Family Trip`}
        </h3>
        <p className="text-muted-foreground mt-1">
          Review your trip details before generating the itinerary
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium">Destination</div>
            <div className="text-muted-foreground">{formData.destination}</div>
          </div>
        </div>

        {formData.hasDates && formData.startDate && formData.endDate ? (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Dates</div>
              <div className="text-muted-foreground">
                {formatDate(formData.startDate)} - {formatDate(formData.endDate)}
                {getTripDuration() && <span className="text-sm ml-2">({getTripDuration()})</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Dates</div>
              <div className="text-muted-foreground italic">Still deciding on dates</div>
            </div>
          </div>
        )}

        {formData.travelingWithKids && formData.kidsAges.length > 0 ? (
          <div className="flex items-start gap-3">
            <Baby className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Kids</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.kidsAges.map((age, i) => (
                  <Badge key={i} variant="secondary">
                    {age} {age === 1 ? "year" : "years"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Baby className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Travelers</div>
              <div className="text-muted-foreground">Adults only</div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium">Interests</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.interests.map((interest) => (
                <Badge key={interest} variant="outline">
                  {INTEREST_LABELS[interest] || interest}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Gauge className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium">Pace</div>
            <div className="text-muted-foreground capitalize">{formData.pacePreference}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium">Budget</div>
            <div className="text-muted-foreground capitalize">{formData.budgetLevel}</div>
          </div>
        </div>

        {formData.lodgingLocation && (
          <div className="flex items-start gap-3">
            <Home className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Staying at</div>
              <div className="text-muted-foreground">{formData.lodgingLocation}</div>
            </div>
          </div>
        )}

        {formData.napSchedule && (
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Nap Schedule</div>
              <div className="text-muted-foreground">{NAP_LABELS[formData.napSchedule]}</div>
            </div>
          </div>
        )}

        {formData.strollerNeeds && (
          <div className="flex items-start gap-3">
            <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Stroller</div>
              <div className="text-muted-foreground">Prioritizing stroller-friendly options</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Click "Generate Itinerary" to create your personalized day-by-day plan
          with activities, meals, and Plan B options.
        </p>
      </div>
    </div>
  );
};
