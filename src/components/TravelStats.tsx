import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Award, TrendingUp, Users, Plane, Target, Calendar } from "lucide-react";
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

  // Calculate percentiles based on countries visited
  // Source: Research shows most people visit 3-10 countries in their lifetime
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
      description: `Total days spent outside the USA exploring the world`,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Globe,
      label: "Global Ranking",
      value: `Top ${100 - globalPercentile}%`,
      description: `You've traveled more than ${globalPercentile}% of the global population`,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Target,
      label: "World Coverage",
      value: `${worldCoveragePercent}%`,
      description: `Visited ${totalCountries} out of 195 UN-recognized countries`,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Award,
      label: "Continental Explorer",
      value: `${continentCoveragePercent}%`,
      description: `Explored ${totalContinents} of 7 continents worldwide`,
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Plane,
      label: "Family Average",
      value: `${avgCountriesPerMember.toFixed(1)}`,
      description: mostTraveledMember 
        ? `Average countries per person (Top traveler: ${mostTraveledMember.name})`
        : "Average countries per family member",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Users,
      label: "Family Goal Progress",
      value: `${((totalCountries / 195) * 100).toFixed(0)}%`,
      description: `On track to visit all countries together`,
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Travel Achievements
          </h2>
          <p className="text-muted-foreground text-lg">
            Your family's incredible journey in numbers
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-foreground">
                  {stat.value}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stat.description}
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
