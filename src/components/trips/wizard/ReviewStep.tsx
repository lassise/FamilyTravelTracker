import { Badge } from "@/components/ui/badge";
import { TripFormData } from "../TripWizard";
import CountryFlag from "@/components/common/CountryFlag";
import { getEffectiveFlagCode } from "@/lib/countriesData";
import {
  MapPin,
  Calendar,
  Baby,
  Heart,
  Gauge,
  DollarSign,
  Home,
  Clock,
  ShoppingCart,
  Globe,
  ArrowRight
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

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

// Removed NAP_LABELS

export const ReviewStep = ({ formData }: ReviewStepProps) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (date: string) => {
    try {
      return format(parseISO(date), "MMM d");
    } catch {
      return date;
    }
  };

  const getTripDuration = () => {
    if (!formData.hasDates) {
      const totalDays = formData.legs.reduce((sum, l) => sum + (l.duration_days || 0), 0);
      return totalDays > 0 ? `${totalDays} day${totalDays !== 1 ? "s" : ""}` : null;
    }

    if (formData.legs.length === 0) {
      if (!formData.startDate || !formData.endDate) return null;
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    // Calculate from legs
    const sortedLegs = [...formData.legs].filter(l => l.start_date && l.end_date)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    if (sortedLegs.length === 0) return null;
    const firstDate = sortedLegs[0].start_date;
    const lastDate = sortedLegs[sortedLegs.length - 1].end_date;
    const days = differenceInDays(parseISO(lastDate), parseISO(firstDate)) + 1;
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  // Generate trip title from legs if not provided
  const getTripTitle = () => {
    if (formData.title) return formData.title;
    if (formData.legs.length === 0) return `${formData.destination || "New"} Trip`;
    const countries = [...new Set(formData.legs.map(l => l.country_name).filter(Boolean))];
    if (countries.length === 1) return `${countries[0]} Trip`;
    if (countries.length === 2) return `${countries[0]} & ${countries[1]} Trip`;
    return `${countries[0]} + ${countries.length - 1} more Trip`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h3 className="text-xl font-semibold">{getTripTitle()}</h3>
        <p className="text-muted-foreground mt-1">
          Review your trip details before generating the itinerary
        </p>
      </div>

      <div className="space-y-4">
        {/* Trip Legs / Destinations */}
        {formData.legs.length > 0 ? (
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-2">
                {formData.legs.length === 1 ? "Destination" : `Itinerary (${formData.legs.length} countries)`}
              </div>
              <div className="space-y-2">
                {formData.legs.map((leg, index) => {
                  const { code } = getEffectiveFlagCode(leg.country_name, "");
                  const legDays = leg.start_date && leg.end_date
                    ? differenceInDays(parseISO(leg.end_date), parseISO(leg.start_date)) + 1
                    : 0;
                  return (
                    <div key={leg.id} className="flex items-center gap-2 text-sm">
                      {index > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      {code ? (
                        <CountryFlag countryCode={code} countryName={leg.country_name} size="sm" />
                      ) : null}
                      <span className="font-medium">{leg.country_name}</span>
                      {formData.hasDates && leg.start_date && leg.end_date && (
                        <span className="text-muted-foreground">
                          ({formatShortDate(leg.start_date)} – {formatShortDate(leg.end_date)}, {legDays}d)
                        </span>
                      )}
                      {!formData.hasDates && leg.duration_days && (
                        <span className="text-muted-foreground text-xs">
                          ({leg.duration_days} days)
                        </span>
                      )}
                      {leg.cities.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          • {leg.cities.join(", ")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {getTripDuration() && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Total: {getTripDuration()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Destination</div>
              <div className="text-muted-foreground">{formData.destination || "Not specified"}</div>
            </div>
          </div>
        )}

        {/* Only show separate dates section if no legs (legacy mode) */}
        {formData.legs.length === 0 && formData.hasDates && formData.startDate && formData.endDate && (
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
        )}

        {formData.travelingWithKids && formData.kidsAges.length > 0 ? (
          <div className="flex items-start gap-3">
            <Baby className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Kids</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.kidsAges.map((age, i) => (
                  <Badge key={i} variant="secondary">
                    {age < 1 ? "Under 1 yr" : `${age} ${age === 1 ? "year" : "years"}`}
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

        {formData.napStartTime && formData.napEndTime && (
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Nap Schedule</div>
              <div className="text-muted-foreground">{formData.napStartTime} to {formData.napEndTime}</div>
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
