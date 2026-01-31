import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, ArrowRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import TravelMilestones from "@/components/travel/TravelMilestones";
import PublicTravelTimeline from "@/components/travel/PublicTravelTimeline";
import PublicPhotoGallery from "@/components/travel/PublicPhotoGallery";
import { useHomeCountry } from "@/hooks/useHomeCountry";

interface ShareSettings {
  show_stats: boolean;
  show_map: boolean;
  show_countries: boolean;
  show_photos: boolean;
  show_timeline: boolean;
  show_family_members: boolean;
  show_achievements: boolean;
  show_wishlist: boolean;
  include_memories?: boolean;
}

interface OwnerProfile {
  fullName: string | null;
  avatarUrl: string | null;
  homeCountry: string | null;
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
  avatar: string | null;
  color: string;
  countriesVisited: number;
}

interface VisitDetail {
  id: string;
  country_id: string;
  visit_date: string | null;
  end_date: string | null;
  number_of_days: number | null;
  notes: string | null;
  approximate_year: number | null;
  approximate_month: number | null;
  is_approximate: boolean | null;
  trip_name: string | null;
  highlight: string | null;
  why_it_mattered: string | null;
}

interface VisitFamilyMember {
  visit_id: string;
  family_member_id: string;
}

interface StateVisit {
  id: string;
  state_code: string;
  state_name: string;
  country_code: string;
  country_id: string | null;
  family_member_id: string | null;
  created_at: string | null;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  country_id: string | null;
  taken_at: string | null;
}

interface Stats {
  visitedCountriesCount: number;
  visitedContinentsCount: number;
  visitedStatesCount: number;
  earliestYear: number | null;
}

interface DashboardData {
  shareSettings: ShareSettings;
  owner: OwnerProfile;
  countries: Country[];
  familyMembers: FamilyMember[];
  visitDetails: VisitDetail[];
  visitFamilyMembers: VisitFamilyMember[];
  stateVisits: StateVisit[];
  photos: Photo[];
  stats: Stats;
}

interface DashboardState {
  loading: boolean;
  error: string | null;
  data: DashboardData | null;
  debug: Record<string, unknown> | null;
}

/**
 * PublicDashboard - Renders a shared travel dashboard for anonymous viewers
 * VERIFICATION: Logs token and data fetching for debugging
 */
const PublicDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get("debug") === "1" || import.meta.env.DEV;

  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    data: null,
    debug: null,
  });

  // Family member filter state
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const resolvedHome = useHomeCountry(state.data?.owner?.homeCountry || null);

  // DEV logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[PublicDashboard] Token from URL:", token);
    }
  }, [token]);

  // Build visitMemberMap from visitFamilyMembers
  const visitMemberMap = useMemo(() => {
    const map = new globalThis.Map<string, string[]>();
    if (!state.data?.visitFamilyMembers) return map;
    state.data.visitFamilyMembers.forEach((vfm) => {
      if (vfm.visit_id && vfm.family_member_id) {
        const existing = map.get(vfm.visit_id) || [];
        if (!existing.includes(vfm.family_member_id)) {
          existing.push(vfm.family_member_id);
          map.set(vfm.visit_id, existing);
        }
      }
    });
    return map;
  }, [state.data?.visitFamilyMembers]);

  // Filter visit details by selected family member
  const filteredVisitDetails = useMemo(() => {
    if (!state.data?.visitDetails) return [];
    if (!selectedMemberId) return state.data.visitDetails;
    
    return state.data.visitDetails.filter((visit) => {
      const memberIds = visitMemberMap.get(visit.id) || [];
      return memberIds.includes(selectedMemberId);
    });
  }, [state.data?.visitDetails, selectedMemberId, visitMemberMap]);

  // Filter countries by selected family member
  const filteredCountries = useMemo(() => {
    if (!state.data?.countries) return [];
    if (!selectedMemberId) return state.data.countries;
    
    const selectedMember = state.data.familyMembers.find(m => m.id === selectedMemberId);
    if (!selectedMember) return state.data.countries;
    
    return state.data.countries.map(country => ({
      ...country,
      visitedBy: country.visitedBy.filter(name => name === selectedMember.name),
    }));
  }, [state.data?.countries, state.data?.familyMembers, selectedMemberId]);

  // Compute total continents from filtered countries
  const totalContinents = useMemo(() => {
    const visitedCountries = filteredCountries.filter((c) => c.visitedBy.length > 0);
    const continents = new Set(visitedCountries.map((c) => c.continent));
    return continents.size;
  }, [filteredCountries]);

  useEffect(() => {
    async function loadPublicDashboard() {
      if (!token) {
        setState({ loading: false, error: "No token provided", data: null, debug: null });
        return;
      }

      try {
        // Call Edge Function - ONLY data source for this page
        const { data, error } = await supabase.functions.invoke("get-public-dashboard", {
          body: { token },
        });

        if (error) throw error;

        if (!data.ok) {
          setState({
            loading: false,
            error: data.error || "Share link not available",
            data: null,
            debug: data.debug,
          });
          return;
        }

        // Success - render owner's data
        setState({
          loading: false,
          error: null,
          data: data.data,
          debug: data.debug,
        });
        
      } catch (err) {
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load dashboard",
          data: null,
          debug: null,
        });
      }
    }

    loadPublicDashboard();
  }, [token]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-6">{state.error || "Profile not found or is private"}</p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Want to track your family's adventures?
              </p>
              {/* FIX: Route to signup tab, not signin */}
              <Link to="/auth?tab=signup">
                <Button className="w-full">
                  Sign up for Family Travel Tracker — it's free!
                </Button>
              </Link>
            </div>
            {debugMode && state.debug && (
              <pre className="mt-6 text-left text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(state.debug, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data, debug } = state;
  const { shareSettings, owner, familyMembers, stateVisits, photos, stats } = data;
  const showMemories = shareSettings.show_timeline || shareSettings.show_photos || shareSettings.include_memories;

  return (
    <div className="min-h-screen bg-background">
      {/* CTA Banner for non-users - FIX: Route to signup */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-foreground">
                Want to track your family's adventures?
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Sign up for Family Travel Tracker for free
              </p>
            </div>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="whitespace-nowrap">
                Sign Up Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section with Family Member Filter */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {owner.fullName || "Traveler"}'s Travel Dashboard
            </h1>
            <p className="text-muted-foreground">
              Explore their family's adventures and travel statistics.
            </p>
          </div>
          
          {/* Family Member Filter - ADD: Filter dropdown */}
          {familyMembers.length > 1 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedMemberId || "all"}
                onValueChange={(value) => setSelectedMemberId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.countriesVisited} countries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Hero Summary - Countries Visited Overview */}
        {shareSettings.show_stats && (
          <div className="mb-8">
            <HeroSummaryCard
              countries={filteredCountries}
              familyMembers={familyMembers}
              totalContinents={totalContinents}
              homeCountry={owner.homeCountry || null}
              earliestYear={stats.earliestYear}
              visitMemberMap={visitMemberMap}
              selectedMemberId={selectedMemberId}
              filterComponent={
                selectedMemberId ? (
                  <div className="text-sm text-muted-foreground">
                    Viewing: {familyMembers.find(m => m.id === selectedMemberId)?.name || "All"}
                  </div>
                ) : familyMembers.length > 1 ? (
                  <div className="text-sm text-muted-foreground">
                    Viewing all {familyMembers.length} members
                  </div>
                ) : undefined
              }
            />
          </div>
        )}

        {/* Interactive World Map */}
        {shareSettings.show_map && (
          <div className="mb-8">
            <InteractiveWorldMap
              countries={filteredCountries}
              wishlist={[]}
              homeCountry={owner.homeCountry || null}
              onRefetch={() => {}}
              selectedMemberId={selectedMemberId}
              readOnly
              stateVisitsOverride={stateVisits}
            />
          </div>
        )}

        {/* Travel Milestones */}
        {shareSettings.show_achievements && (
          <div className="mb-8">
            <TravelMilestones
              countries={filteredCountries}
              familyMembers={familyMembers}
              totalContinents={totalContinents}
            />
          </div>
        )}

        {/* Memories Section - Timeline and Photos - ADD: Must render */}
        {showMemories && (
          <div className="mb-8 space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Memories</h2>
              {selectedMemberId && (
                <span className="text-sm text-muted-foreground">
                  — {familyMembers.find(m => m.id === selectedMemberId)?.name}'s trips
                </span>
              )}
            </div>
            
            {/* Public Timeline with proper formatting (flags, colors, dates) */}
            {(shareSettings.show_timeline || shareSettings.include_memories) && filteredVisitDetails.length > 0 && (
              <PublicTravelTimeline 
                countries={filteredCountries} 
                visitDetails={filteredVisitDetails}
                photos={photos}
              />
            )}

            {/* Photo Gallery */}
            {shareSettings.show_photos && photos.length > 0 && (
              <PublicPhotoGallery countries={filteredCountries} photos={photos} />
            )}
            
            {/* Empty state if no memories */}
            {filteredVisitDetails.length === 0 && photos.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No travel memories to display yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bottom CTA - FIX: Route to signup */}
        <Card className="bg-gradient-to-r from-primary/5 via-background to-secondary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <Globe className="h-10 w-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Start Your Own Travel Journey
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Track your family's adventures, discover new destinations, and create lasting memories together.
            </p>
            <Link to="/auth?tab=signup">
              <Button size="lg">
                Sign Up for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Debug Panel - DEV only */}
        {debugMode && debug && (
          <Card className="mt-8 border-orange-500/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2 text-orange-500">🔧 Debug Info (DEV only)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Token:</span>
                  <span className="font-mono ml-2">{token?.substring(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <span className="ml-2">{debug.token_source as string}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Family Members:</span>
                  <span className="ml-2">{familyMembers.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Visit Details:</span>
                  <span className="ml-2">{data.visitDetails.length}</span>
                </div>
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">Full debug JSON</summary>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96 mt-2">
                  {JSON.stringify(debug, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicDashboard;
