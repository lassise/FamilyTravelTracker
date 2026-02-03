// AUDIT RESULTS:
// Dashboard: /src/pages/Dashboard.tsx
// Quick Actions: Line 273-367 in Dashboard.tsx
//   - Analytics button: Line 294 - navigates to /family?tab=analytics
//   - Achievements button: Line 309 - navigates to /family?tab=achievements
// Analytics: /src/components/travel/AnalyticsInsightCard.tsx (displays continent progress, charts)
// Achievements: /src/components/travel/EnhancedAchievements.tsx (displays badges, progress, goals)
// Travel Tracker: Lines 233-271 in Dashboard.tsx (HeroSummaryCard, InteractiveWorldMap, TravelMilestones) - DO NOT MODIFY

import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useTrips";
import { useFamilyData } from "@/hooks/useFamilyData";
import { useStateVisits } from "@/hooks/useStateVisits";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import DashboardMemberFilter from "@/components/travel/DashboardMemberFilter";

import TravelMilestones from "@/components/travel/TravelMilestones";
import AnalyticsInsightCard from "@/components/travel/AnalyticsInsightCard";
import EnhancedAchievements from "@/components/travel/EnhancedAchievements";
import {
  Plus,
  Plane,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  Globe,
  Loader2,
  Map,
  Trophy,
  BarChart3,
  PlaneTakeoff,
  Compass,
  Crown
} from "lucide-react";

const Dashboard = () => {
  const { user, profile, loading: authLoading, needsOnboarding } = useAuth();
  const { trips, loading: tripsLoading } = useTrips();
  const { familyMembers, countries, wishlist, homeCountry, loading: familyLoading, totalContinents, refetch: refetchFamilyData } = useFamilyData();
  const { visitDetails } = useVisitDetails();
  const { getStateVisitCount, stateVisits } = useStateVisits();
  const resolvedHome = useHomeCountry(homeCountry);
  const navigate = useNavigate();
  const [visitMemberMap, setVisitMemberMap] = useState<globalThis.Map<string, string[]>>(() => new globalThis.Map());

  // Refs for smooth scrolling
  const analyticsRef = useRef<HTMLDivElement>(null);
  const achievementsRef = useRef<HTMLDivElement>(null);
  const travelTrackerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Dashboard filter state
  const {
    selectedMemberId,
    setSelectedMemberId,
    getFilteredCountries,
    getFilteredContinents,
    getFilteredEarliestYear,
  } = useDashboardFilter(familyMembers);

  // Fetch visit-member mappings for "Since" calculation
  useEffect(() => {
    if (!user) return;

    const fetchVisitMembers = async () => {
      // Fetch visit_family_members scoped to current user (RLS should handle this, but be explicit)
      const { data, error } = await supabase
        .from('visit_family_members')
        .select('visit_id, family_member_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching visit members:', error);
        return;
      }

      if (data) {
        const map = new globalThis.Map<string, string[]>();
        data.forEach(item => {
          if (item.visit_id && item.family_member_id) {
            const existing = map.get(item.visit_id) || [];
            if (!existing.includes(item.family_member_id)) {
              existing.push(item.family_member_id);
              map.set(item.visit_id, existing);
            }
          }
        });
        setVisitMemberMap(map);
      } else {
        // Clear map if no data
        setVisitMemberMap(new globalThis.Map());
      }
    };
    fetchVisitMembers();

    // Subscribe to changes in visit_family_members
    const channel = supabase
      .channel('visit_family_members_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visit_family_members' },
        () => {
          // Debounce updates
          setTimeout(fetchVisitMembers, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  // Memoize computed values
  const upcomingTrips = useMemo(() =>
    trips.filter((t) => t.status === "upcoming" || t.status === "planning"),
    [trips]
  );

  const activeTrips = useMemo(() =>
    trips.filter((t) => t.status === "active"),
    [trips]
  );

  // Apply member filter to countries
  const filteredCountries = useMemo(() =>
    getFilteredCountries(countries),
    [countries, getFilteredCountries]
  );

  // Calculate filtered continents
  const filteredContinents = useMemo(() =>
    getFilteredContinents(countries),
    [countries, getFilteredContinents]
  );

  // Calculate filtered earliest year
  const filteredEarliestYear = useMemo(() =>
    getFilteredEarliestYear(visitDetails, visitMemberMap),
    [visitDetails, visitMemberMap, getFilteredEarliestYear]
  );

  // Count visited countries excluding home country (using filtered data)
  const visitedCountriesCount = useMemo(() =>
    filteredCountries.filter(c => c.visitedBy.length > 0 && !resolvedHome.isHomeCountry(c.name)).length,
    [filteredCountries, resolvedHome]
  );

  // List of 50 US states (excluding DC and territories)
  const continentalUSStates = useMemo(() => {
    const stateCodes = [
      'US-AL', 'US-AZ', 'US-AR', 'US-CA', 'US-CO', 'US-CT', 'US-DE', 'US-FL',
      'US-GA', 'US-ID', 'US-IL', 'US-IN', 'US-IA', 'US-KS', 'US-KY', 'US-LA',
      'US-ME', 'US-MD', 'US-MA', 'US-MI', 'US-MN', 'US-MS', 'US-MO', 'US-MT',
      'US-NE', 'US-NV', 'US-NH', 'US-NJ', 'US-NM', 'US-NY', 'US-NC', 'US-ND',
      'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI', 'US-SC', 'US-SD', 'US-TN',
      'US-TX', 'US-UT', 'US-VT', 'US-VA', 'US-WA', 'US-WV', 'US-WI', 'US-WY',
      'US-AK', 'US-HI' // Alaska and Hawaii are included in the 50 states
    ];
    return new Set(stateCodes);
  }, []);

  // Get states visited count for home country (filtered by selected member if applicable)
  const statesVisitedCount = useMemo(() => {
    if (!resolvedHome.iso2 || !resolvedHome.hasStateTracking) return 0;

    if (selectedMemberId) {
      // Filter by selected member - only count unique states where this member visited
      const uniqueStates = new Set(
        stateVisits
          .filter(sv => {
            if (sv.country_code !== resolvedHome.iso2 || sv.family_member_id !== selectedMemberId) {
              return false;
            }
            // For US, only count 50 continental states (exclude DC and territories)
            if (resolvedHome.iso2 === 'US' && !continentalUSStates.has(sv.state_code)) {
              return false;
            }
            return true;
          })
          .map(sv => sv.state_code)
      );
      return uniqueStates.size;
    }

    // Return unique state count (all members) - filtered to 50 states for US
    if (resolvedHome.iso2 === 'US') {
      const uniqueStates = new Set(
        stateVisits
          .filter(sv =>
            sv.country_code === resolvedHome.iso2 &&
            continentalUSStates.has(sv.state_code)
          )
          .map(sv => sv.state_code)
      );
      return uniqueStates.size;
    }

    return getStateVisitCount(resolvedHome.iso2);
  }, [resolvedHome, getStateVisitCount, stateVisits, selectedMemberId, continentalUSStates]);

  const formatDate = useCallback((date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  if (authLoading || tripsLoading || familyLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Traveler"}!
          </h1>
          <p className="text-muted-foreground">
            Track your family's adventures, plan your next trip, and explore new destinations.
          </p>
        </div>

        {/* Travel Tracker Section - DO NOT MODIFY */}
        <section ref={travelTrackerRef} className="mb-12 scroll-mt-4">
          {/* Hero Summary - Countries Visited Overview */}
          <div className="mb-8">
            <HeroSummaryCard
              countries={filteredCountries}
              familyMembers={familyMembers}
              totalContinents={filteredContinents}
              homeCountry={homeCountry}
              earliestYear={filteredEarliestYear}
              visitMemberMap={visitMemberMap}
              selectedMemberId={selectedMemberId}
              filterComponent={
                <DashboardMemberFilter
                  familyMembers={familyMembers}
                  selectedMemberId={selectedMemberId}
                  onSelectMember={setSelectedMemberId}
                />
              }
            />
          </div>

          {/* Interactive World Map removed and moved to Travel Tracker */}
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card
              className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
              onClick={() => navigate("/family")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Countries</h3>
                  <p className="text-xs text-muted-foreground">Track visits</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
              onClick={() => scrollToSection(analyticsRef)}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Analytics</h3>
                  <p className="text-xs text-muted-foreground">View stats</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
              onClick={() => scrollToSection(achievementsRef)}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Achievements</h3>
                  <p className="text-xs text-muted-foreground">Earn badges</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group"
              onClick={() => navigate("/trips/new")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center relative">
                <Crown className="absolute top-2 right-2 h-4 w-4 text-amber-500" title="Premium" />
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Planner</h3>
                  <p className="text-xs text-muted-foreground">Plan trip</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group"
              onClick={() => navigate("/flights")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center relative">
                <Crown className="absolute top-2 right-2 h-4 w-4 text-amber-500" title="Premium" />
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlaneTakeoff className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Flights</h3>
                  <p className="text-xs text-muted-foreground">Search flights</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group"
              onClick={() => navigate("/explore")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Compass className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Explore</h3>
                  <p className="text-xs text-muted-foreground">Destinations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Analytics Section - Embedded in Dashboard */}
        <section ref={analyticsRef} className="mb-12 scroll-mt-4">
          <h2 className="text-3xl font-bold mb-6">Analytics</h2>
          <AnalyticsInsightCard countries={filteredCountries} />
        </section>

        {/* Achievements Section - Embedded in Dashboard */}
        <section ref={achievementsRef} className="mb-12 scroll-mt-4">
          <EnhancedAchievements
            countries={filteredCountries}
            familyMembers={familyMembers}
            totalContinents={filteredContinents}
          />
        </section>

      </div>
    </AppLayout>
  );
};

export default Dashboard;
