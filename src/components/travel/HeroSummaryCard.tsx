import { useMemo, memo, ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Globe2, Users, Plane, Calendar } from "lucide-react";
import { Country, FamilyMember } from "@/hooks/useFamilyData";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import { useStateVisits } from "@/hooks/useStateVisits";
import CountryFlag from "@/components/common/CountryFlag";
import ContinentBreakdownDialog from "./ContinentBreakdownDialog";
interface HeroSummaryCardProps {
  countries: Country[];
  familyMembers: FamilyMember[];
  totalContinents: number;
  homeCountry?: string | null;
  filterComponent?: ReactNode;
  earliestYear?: number | null;
}

const HeroSummaryCard = memo(({ 
  countries, 
  familyMembers, 
  totalContinents, 
  homeCountry, 
  filterComponent,
  earliestYear
}: HeroSummaryCardProps) => {
  const navigate = useNavigate();
  const [showContinentDialog, setShowContinentDialog] = useState(false);
  const resolvedHome = useHomeCountry(homeCountry);
  const { getStateVisitCount } = useStateVisits();
  
  // Exclude home country from visited countries count
  const visitedCountries = useMemo(() => 
    countries.filter(c => c.visitedBy.length > 0 && !resolvedHome.isHomeCountry(c.name)),
    [countries, resolvedHome]
  );

  // Get states visited for home country
  const statesVisitedCount = useMemo(() => {
    if (!resolvedHome.iso2 || !resolvedHome.hasStateTracking) return 0;
    return getStateVisitCount(resolvedHome.iso2);
  }, [resolvedHome, getStateVisitCount]);

  // Handle stat card clicks
  const handleStatClick = (label: string) => {
    if (label === "Countries") {
      navigate("/travel-history?tab=countries");
    } else if (label === "Continents") {
      setShowContinentDialog(true);
    }
  };

  const isClickable = (label: string) => label === "Countries" || label === "Continents";
  const stats = useMemo(() => {
    const baseStats: Array<{
      icon: typeof Globe2 | null;
      value: number | string;
      label: string;
      color: string;
      bgColor: string;
      flagCode?: string;
    }> = [
      {
        icon: Globe2,
        value: visitedCountries.length,
        label: "Countries",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
    ];

    // Add states visited if home country supports it - use home country flag as icon
    if (resolvedHome.hasStateTracking && statesVisitedCount > 0) {
      baseStats.push({
        icon: null, // Will use flag instead
        value: statesVisitedCount,
        label: "States",
        color: "text-accent",
        bgColor: "bg-accent/10",
        flagCode: resolvedHome.iso2,
      });
    }

    baseStats.push({
      icon: Plane,
      value: totalContinents,
      label: "Continents",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    });

    baseStats.push({
      icon: Users,
      value: familyMembers.length,
      label: "Travelers",
      color: "text-accent",
      bgColor: "bg-accent/10",
    });

    if (earliestYear) {
      baseStats.push({
        icon: Calendar,
        value: `'${earliestYear.toString().slice(-2)}`,
        label: "Since",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      });
    }

    return baseStats;
  }, [visitedCountries.length, totalContinents, familyMembers.length, earliestYear, resolvedHome.hasStateTracking, statesVisitedCount]);

  const progressPercent = useMemo(() => 
    Math.round((visitedCountries.length / 195) * 100),
    [visitedCountries.length]
  );

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Your Travel Journey
            </h2>
            <p className="text-sm text-muted-foreground">
              {visitedCountries.length > 0 
                ? `Exploring the world, one country at a time`
                : `Start your adventure today`
              }
            </p>
          </div>
          {filterComponent}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const clickable = isClickable(stat.label);
            return (
              <div
                key={index}
                onClick={() => handleStatClick(stat.label)}
                className={`flex flex-col items-center text-center p-3 rounded-xl bg-background/60 backdrop-blur-sm transition-all ${
                  clickable 
                    ? "cursor-pointer hover:bg-background/80 hover:scale-105 active:scale-95" 
                    : ""
                }`}
              >
                <div className={`p-2 rounded-full ${stat.bgColor} mb-2`}>
                  {stat.flagCode ? (
                    <CountryFlag countryCode={stat.flagCode} countryName="Home" size="sm" />
                  ) : Icon ? (
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  ) : null}
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>World exploration</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>

      <ContinentBreakdownDialog
        open={showContinentDialog}
        onOpenChange={setShowContinentDialog}
        countries={countries}
        homeCountryName={resolvedHome.name}
      />
    </Card>
  );
});

HeroSummaryCard.displayName = "HeroSummaryCard";

export default HeroSummaryCard;
