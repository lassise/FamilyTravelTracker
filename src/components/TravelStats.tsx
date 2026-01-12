import { Card, CardContent } from "@/components/ui/card";
import { Globe, Award, Users, Plane, Target, Calendar, MapPin, Repeat } from "lucide-react";
import type { FamilyMember } from "@/hooks/useFamilyData";
import { useVisitDetails } from "@/hooks/useVisitDetails";

interface TravelStatsProps {
  totalCountries: number;
  totalContinents: number;
  familyMembers: FamilyMember[];
}

const TravelStats = ({ totalCountries, totalContinents, familyMembers }: TravelStatsProps) => {
  const { visitDetails } = useVisitDetails();
  
  // Calculate total days abroad
  const totalDaysAbroad = visitDetails.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
  const avgCountriesPerMember = familyMembers.length > 0 
    ? familyMembers.reduce((sum, member) => sum + member.countriesVisited, 0) / familyMembers.length
    : 0;

  // Find the most traveled member
  const mostTraveledMember = familyMembers.length > 0
    ? familyMembers.reduce((max, member) => 
        member.countriesVisited > max.countriesVisited ? member : max
      )
    : null;

  // Calculate most visited country (by trip count) and most days spent
  const countryVisitCounts = visitDetails.reduce((acc, v) => {
    acc[v.country_id] = (acc[v.country_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryDaysCounts = visitDetails.reduce((acc, v) => {
    acc[v.country_id] = (acc[v.country_id] || 0) + (v.number_of_days || 0);
    return acc;
  }, {} as Record<string, number>);

  // Most visited country by number of trips
  const mostVisitedCountryId = Object.entries(countryVisitCounts)
    .sort(([, a], [, b]) => b - a)[0];
  const mostVisitedTrips = mostVisitedCountryId ? mostVisitedCountryId[1] : 0;

  // Country with most collective days
  const mostDaysCountryId = Object.entries(countryDaysCounts)
    .sort(([, a], [, b]) => b - a)[0];
  const mostDaysTotal = mostDaysCountryId ? mostDaysCountryId[1] : 0;

  // Calculate percentiles based on countries visited
  const getGlobalPercentile = (countries: number): number => {
    if (countries >= 50) return 99;
    if (countries >= 40) return 97;
    if (countries >= 30) return 93;
    if (countries >= 25) return 88;
    if (countries >= 20) return 82;
    if (countries >= 15) return 72;
    if (countries >= 10) return 55;
    if (countries >= 5) return 35;
    return 15;
  };

  // Calculate what percentage of world countries visited
  const worldCoveragePercent = ((totalCountries / 195) * 100).toFixed(1);

  // Calculate continental coverage
  const continentCoveragePercent = ((totalContinents / 7) * 100).toFixed(0);

  const globalPercentile = getGlobalPercentile(totalCountries);
  
  const stats = [
    {
      icon: Calendar,
      label: "Days Abroad",
      value: `${totalDaysAbroad}`,
      description: `Total days spent exploring the world`,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Repeat,
      label: "Most Visited",
      value: mostVisitedTrips > 0 ? `${mostVisitedTrips} trips` : "—",
      description: mostVisitedTrips > 0 ? `Your most frequently visited destination` : "Log trip details to see",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      icon: MapPin,
      label: "Longest Stay",
      value: mostDaysTotal > 0 ? `${mostDaysTotal} days` : "—",
      description: mostDaysTotal > 0 ? `Most collective time in one country` : "Add trip durations to see",
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      icon: Globe,
      label: "Global Ranking",
      value: `Top ${100 - globalPercentile}%`,
      description: `You've traveled more than ${globalPercentile}% of people`,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Target,
      label: "World Coverage",
      value: `${worldCoveragePercent}%`,
      description: `Visited ${totalCountries} of 195 countries`,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Award,
      label: "Continents",
      value: `${continentCoveragePercent}%`,
      description: `Explored ${totalContinents} of 7 continents`,
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Plane,
      label: "Family Average",
      value: `${avgCountriesPerMember.toFixed(1)}`,
      description: mostTraveledMember 
        ? `Top traveler: ${mostTraveledMember.name}`
        : "Countries per member",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Users,
      label: "Family Goal",
      value: `${((totalCountries / 195) * 100).toFixed(0)}%`,
      description: `Progress to all countries`,
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Travel Highlights
          </h2>
          <p className="text-muted-foreground text-sm">
            Your family's journey in numbers
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {stats.map((stat, index) => (
            <Card key={index} className="group hover:shadow-md transition-all duration-300 border hover:border-primary/30">
              <CardContent className="p-3 text-center">
                <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${stat.gradient} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-lg font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TravelStats;
