import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import TravelMilestones from "@/components/travel/TravelMilestones";
import PublicPhotoGallery from "@/components/travel/PublicPhotoGallery";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";

interface ShareProfile {
  id: string;
  user_id: string;
  is_public: boolean;
  show_stats: boolean;
  show_map: boolean;
  show_countries: boolean;
  show_cities: boolean;
  show_achievements: boolean;
  show_timeline: boolean;
  show_family_members: boolean;
  custom_headline: string | null;
}

interface UserProfile {
  full_name: string | null;
  home_country: string | null;
}

interface Country {
  id: string;
  name: string;
  flag: string;
  continent: string;
  visitedBy: string[];
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  color: string;
}

const PublicDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareProfile, setShareProfile] = useState<ShareProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [visitDetails, setVisitDetails] = useState<any[]>([]);
  const [visitMemberMap, setVisitMemberMap] = useState<globalThis.Map<string, string[]>>(() => new globalThis.Map());
  const [photos, setPhotos] = useState<any[]>([]);
  
  const resolvedHome = useHomeCountry(userProfile?.home_country || null);
  const [stateVisits, setStateVisits] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Dashboard filter state
  const {
    getFilteredCountries,
    getFilteredContinents,
    getFilteredEarliestYear,
  } = useDashboardFilter(familyMembers);

  // Helper function to get state visit count
  const getStateVisitCount = useCallback((countryCode: string) => {
    if (!resolvedHome.iso2 || !resolvedHome.hasStateTracking) return 0;
    const uniqueStates = new Set(
      stateVisits
        .filter(sv => sv.country_code === countryCode)
        .map(sv => sv.state_code)
    );
    return uniqueStates.size;
  }, [stateVisits, resolvedHome]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Invalid dashboard link");
        setLoading(false);
        return;
      }

      // Fetch share profile using secure function
      const { data: shareDataArr, error: shareError } = await supabase
        .rpc('get_dashboard_share_profile_by_token', { token });

      if (shareError || !shareDataArr || shareDataArr.length === 0) {
        setError("Dashboard not found or is private");
        setLoading(false);
        return;
      }

      const shareData = shareDataArr[0] as ShareProfile;
      setShareProfile(shareData);

      // Fetch user profile
      const { data: profileDataArr } = await supabase
        .rpc('get_public_profile', { profile_user_id: shareData.user_id });

      if (profileDataArr && profileDataArr.length > 0) {
        setUserProfile(profileDataArr[0] as UserProfile);
      }

      // Fetch family members first (needed to build visitedBy arrays)
      const { data: membersData } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", shareData.user_id)
        .order("created_at", { ascending: true });

      if (membersData) {
        setFamilyMembers(membersData as FamilyMember[]);
      }

      // Fetch countries
      const { data: countriesData } = await supabase
        .from("countries")
        .select("*")
        .eq("user_id", shareData.user_id);

      // Fetch visit details (for earliest year calculation)
      const { data: visitDetailsData } = await supabase
        .from("country_visit_details")
        .select("*")
        .eq("user_id", shareData.user_id)
        .order("visit_date", { ascending: false });

      if (visitDetailsData) {
        setVisitDetails(visitDetailsData);
      }

      // Fetch visit-member mappings
      let visitMembersData: any[] = [];
      if (membersData && membersData.length > 0) {
        const { data: vmd } = await supabase
          .from('visit_family_members')
          .select('visit_id, family_member_id')
          .eq('user_id', shareData.user_id);

        if (vmd) {
          visitMembersData = vmd;
          const map = new globalThis.Map<string, string[]>();
          visitMembersData.forEach(item => {
            if (item.visit_id && item.family_member_id) {
              const existing = map.get(item.visit_id) || [];
              if (!existing.includes(item.family_member_id)) {
                existing.push(item.family_member_id);
                map.set(item.visit_id, existing);
              }
            }
          });
          setVisitMemberMap(map);
        }
      }

      // Fetch visits to determine which countries are visited
      const { data: visitsData } = await supabase
        .from("country_visits")
        .select("country_id, family_member_id")
        .eq("user_id", shareData.user_id);

      // Build visitedBy map: country_id -> Set of member names
      const visitedByMap = new Map<string, Set<string>>();
      if (visitsData && membersData && membersData.length > 0) {
        visitsData.forEach((visit: any) => {
          if (visit.country_id && visit.family_member_id) {
            const member = membersData.find((m: any) => m.id === visit.family_member_id);
            if (member) {
              if (!visitedByMap.has(visit.country_id)) {
                visitedByMap.set(visit.country_id, new Set());
              }
              visitedByMap.get(visit.country_id)!.add(member.name);
            }
          }
        });
      }

      // Also check visit_family_members for detailed visits
      if (visitMembersData && visitDetailsData && membersData && membersData.length > 0) {
        const visitToCountry = new Map<string, string>();
        visitDetailsData.forEach((vd: any) => {
          if (vd.id && vd.country_id) {
            visitToCountry.set(vd.id, vd.country_id);
          }
        });

        visitMembersData.forEach((vm: any) => {
          const countryId = visitToCountry.get(vm.visit_id);
          if (countryId && vm.family_member_id) {
            const member = membersData.find((m: any) => m.id === vm.family_member_id);
            if (member) {
              if (!visitedByMap.has(countryId)) {
                visitedByMap.set(countryId, new Set());
              }
              visitedByMap.get(countryId)!.add(member.name);
            }
          }
        });
      }

      if (countriesData) {
        // Transform countries to include visitedBy array
        const transformedCountries: Country[] = countriesData.map((c: any) => ({
          ...c,
          visitedBy: Array.from(visitedByMap.get(c.id) || []),
        }));
        setCountries(transformedCountries);
      }

      // Fetch state visits if home country supports it
      if (shareData.show_stats) {
        const { data: statesData } = await supabase
          .from("state_visits")
          .select("*")
          .eq("user_id", shareData.user_id);

        if (statesData) {
          setStateVisits(statesData);
        }
      }

      // Fetch photos if enabled (for memories/timeline)
      if (shareData.show_photos || shareData.show_timeline) {
        const { data: photosData } = await supabase
          .from("travel_photos")
          .select("*")
          .eq("user_id", shareData.user_id)
          .order("taken_at", { ascending: false });

        if (photosData) {
          setPhotos(photosData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [token]);

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

  // Calculate total continents
  const totalContinents = useMemo(() => {
    const visitedCountries = filteredCountries.filter(c => c.visitedBy.length > 0);
    const continents = new Set(visitedCountries.map(c => c.continent));
    return continents.size;
  }, [filteredCountries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dashboard Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link to="/auth">
              <Button>Sign Up to Create Your Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* CTA Banner for non-users */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Sign up for free today to track your families travels, find the perfect flights, and plan your trip easily
              </p>
            </div>
            <Link to="/auth">
              <Button className="whitespace-nowrap">
                Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {userProfile?.full_name || "Traveler"}'s Travel Dashboard
          </h1>
          <p className="text-muted-foreground">
            Explore their family's adventures and travel statistics.
          </p>
        </div>

        {/* Hero Summary - Countries Visited Overview */}
        {shareProfile?.show_stats && (
          <div className="mb-8">
            <HeroSummaryCard 
              countries={filteredCountries} 
              familyMembers={familyMembers} 
              totalContinents={totalContinents}
              homeCountry={userProfile?.home_country || null}
              earliestYear={filteredEarliestYear}
              visitMemberMap={visitMemberMap}
              selectedMemberId={selectedMemberId}
              filterComponent={
                familyMembers.length > 1 ? (
                  <div className="text-sm text-muted-foreground">
                    Viewing all members
                  </div>
                ) : undefined
              }
            />
          </div>
        )}

        {/* Interactive World Map */}
        {shareProfile?.show_map && (
          <div className="mb-8">
            <InteractiveWorldMap 
              countries={countries} 
              wishlist={[]} 
              homeCountry={userProfile?.home_country || null}
              onRefetch={() => {}}
              selectedMemberId={selectedMemberId}
            />
          </div>
        )}

        {/* Travel Milestones */}
        {shareProfile?.show_achievements && (
          <div className="mb-8">
            <TravelMilestones 
              countries={countries} 
              familyMembers={familyMembers} 
              totalContinents={totalContinents} 
            />
          </div>
        )}

        {/* Memories Section - Timeline and Photos */}
        {(shareProfile?.show_timeline || shareProfile?.show_photos) && (
          <div className="mb-8 space-y-6">
            <h2 className="text-2xl font-semibold">Memories</h2>
            
            {/* Travel Timeline - Note: TravelTimeline uses useVisitDetails hook which requires auth
                For public dashboard, we show a simplified version or message */}
            {shareProfile?.show_timeline && visitDetails.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Timeline view available when signed in</p>
              </div>
            )}

            {/* Photo Gallery */}
            {shareProfile?.show_photos && (
              <PublicPhotoGallery countries={filteredCountries} photos={photos} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicDashboard;
