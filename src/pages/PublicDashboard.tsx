/**
 * PublicDashboard - The ONLY page for /dashboard/:token route
 * 
 * NON-NEGOTIABLE RULES:
 * 1. This page makes exactly ONE data request: get-shared-dashboard edge function
 * 2. NO direct supabase.from(...) queries for dashboard data
 * 3. NO fallback to logged-in user data
 * 4. All data comes from the edge function response
 * 5. If ?debug=1 is in URL, show debug JSON
 */

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, ArrowRight, Bug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import TravelMilestones from "@/components/travel/TravelMilestones";
import PublicPhotoGallery from "@/components/travel/PublicPhotoGallery";

// Response type from get-shared-dashboard edge function
interface SharedDashboardResponse {
  ok: boolean;
  error?: string;
  debug: {
    token_normalized: string;
    token_found: boolean;
    is_active?: boolean;
    owner_user_id?: string;
    owner_found?: boolean;
    visited_source_tables?: string[];
    visited_query_counts?: {
      visitedCountries: number;
      visitedStates: number;
      visitedContinents: number;
      wishlistCountries: number;
      memories: number;
    };
    map_codes_match?: boolean;
    errors?: string[];
  };
  data?: {
    owner: { displayName: string; avatarUrl?: string; homeCountry?: string };
    shareSettings: {
      show_stats: boolean;
      show_map: boolean;
      show_countries: boolean;
      show_photos: boolean;
      show_timeline: boolean;
      show_family_members: boolean;
      show_achievements: boolean;
      show_wishlist: boolean;
    };
    visited: {
      countries: Array<{ id: string; name: string; flag: string; continent: string }>;
      states: Array<{ state_code: string; state_name: string; country_code: string }>;
      continents: string[];
    };
    wishlist: {
      countries: Array<{ id: string; name: string; flag: string; continent: string }>;
    };
    since: { year?: number; date?: string; label?: string };
    memories: Array<{
      id: string;
      country_id: string;
      country_name?: string;
      trip_name?: string;
      highlight?: string;
      visit_date?: string;
      approximate_year?: number;
      photos?: Array<{ id: string; url: string; caption?: string }>;
    }>;
    map: {
      homeCountryISO3?: string;
      visitedCountryCodes: string[];
      wishlistCountryCodes: string[];
    };
    stats: {
      visitedCountriesCount: number;
      visitedStatesCount: number;
      visitedContinentsCount: number;
      wishlistCountriesCount: number;
    };
    familyMembers?: Array<{
      id: string;
      name: string;
      role: string;
      avatar: string;
      color: string;
      countriesVisited: number;
    }>;
  };
}

const PublicDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const showDebug = searchParams.get("debug") === "1";

  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<SharedDashboardResponse | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) {
        setResponse({
          ok: false,
          error: "No token provided",
          debug: { token_normalized: "", token_found: false, errors: ["Missing token in URL"] },
        });
        setLoading(false);
        return;
      }

      try {
        // SINGLE DATA REQUEST: Edge function only
        const { data, error } = await supabase.functions.invoke<SharedDashboardResponse>(
          "get-shared-dashboard",
          { body: { token: token.trim().toLowerCase() } }
        );

        if (error) {
          console.error("[PublicDashboard] Edge function error:", error);
          setResponse({
            ok: false,
            error: "Failed to load dashboard",
            debug: { token_normalized: token, token_found: false, errors: [error.message] },
          });
        } else if (data) {
          setResponse(data);
        } else {
          setResponse({
            ok: false,
            error: "Empty response from server",
            debug: { token_normalized: token, token_found: false, errors: ["No data returned"] },
          });
        }
      } catch (err) {
        console.error("[PublicDashboard] Fetch error:", err);
        setResponse({
          ok: false,
          error: "Network error",
          debug: { token_normalized: token || "", token_found: false, errors: [String(err)] },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token]);

  // Transform data for components
  const countries = useMemo(() => {
    if (!response?.ok || !response.data) return [];
    // Build visitedBy array for each country
    return response.data.visited.countries.map((c) => ({
      ...c,
      visitedBy: ["Visited"], // Generic marker since we don't need member-specific data for public view
    }));
  }, [response]);

  const wishlistIds = useMemo(() => {
    if (!response?.ok || !response.data) return [];
    return response.data.wishlist.countries.map((c) => c.id);
  }, [response]);

  const familyMembers = useMemo(() => {
    return response?.data?.familyMembers || [];
  }, [response]);

  const stateVisits = useMemo(() => {
    if (!response?.ok || !response.data) return [];
    return response.data.visited.states.map((s, idx) => ({
      id: `state-${idx}`,
      country_id: "",
      country_code: s.country_code,
      state_code: s.state_code,
      state_name: s.state_name,
      family_member_id: "",
      created_at: "",
    }));
  }, [response]);

  const photos = useMemo(() => {
    if (!response?.ok || !response.data) return [];
    const allPhotos: Array<{ id: string; photo_url: string; caption: string; country_id: string; taken_at: string }> = [];
    for (const memory of response.data.memories) {
      if (memory.photos) {
        for (const p of memory.photos) {
          allPhotos.push({
            id: p.id,
            photo_url: p.url,
            caption: p.caption || "",
            country_id: memory.country_id,
            taken_at: memory.visit_date || "",
          });
        }
      }
    }
    return allPhotos;
  }, [response]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (!response?.ok) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-6">{response?.error || "Dashboard not found"}</p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Want to track your family's adventures?
              </p>
              <Link to="/auth">
                <Button className="w-full">
                  Sign up for Family Travel Tracker — it's free!
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Debug panel */}
        {showDebug && response?.debug && (
          <Card className="max-w-2xl w-full mt-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4" />
                <span className="font-mono text-sm font-semibold">Debug Info</span>
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(response.debug, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const data = response.data!;
  const settings = data.shareSettings;

  return (
    <div className="min-h-screen bg-background">
      {/* CTA Banner for non-users */}
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
            <Link to="/auth">
              <Button size="sm" className="whitespace-nowrap">
                Sign Up Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Debug panel at top when ?debug=1 */}
        {showDebug && (
          <Card className="mb-6 border-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-amber-500" />
                <span className="font-mono text-sm font-semibold text-amber-500">Debug Mode Active</span>
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {data.owner.displayName}'s Travel Dashboard
          </h1>
          <p className="text-muted-foreground">
            Explore their family's adventures and travel statistics.
          </p>
        </div>

        {/* Hero Summary - Countries Visited Overview */}
        {settings.show_stats && (
          <div className="mb-8">
            <HeroSummaryCard
              countries={countries}
              familyMembers={familyMembers}
              totalContinents={data.stats.visitedContinentsCount}
              homeCountry={data.owner.homeCountry || null}
              earliestYear={data.since.year || null}
              visitMemberMap={new Map()}
              selectedMemberId={null}
              filterComponent={
                familyMembers.length > 1 ? (
                  <div className="text-sm text-muted-foreground">Viewing all members</div>
                ) : undefined
              }
            />
          </div>
        )}

        {/* Interactive World Map */}
        {settings.show_map && (
          <div className="mb-8">
            <InteractiveWorldMap
              countries={countries}
              wishlist={wishlistIds}
              homeCountry={data.owner.homeCountry || null}
              onRefetch={() => {}}
              selectedMemberId={null}
              readOnly
              stateVisitsOverride={stateVisits}
              // Pass pre-computed ISO3 codes for deterministic map rendering
              visitedISO3Override={data.map.visitedCountryCodes}
              wishlistISO3Override={data.map.wishlistCountryCodes}
              homeISO3Override={data.map.homeCountryISO3}
            />
          </div>
        )}

        {/* Travel Milestones */}
        {settings.show_achievements && (
          <div className="mb-8">
            <TravelMilestones
              countries={countries}
              familyMembers={familyMembers}
              totalContinents={data.stats.visitedContinentsCount}
            />
          </div>
        )}

        {/* Memories Section - Timeline and Photos */}
        {(settings.show_timeline || settings.show_photos) && data.memories.length > 0 && (
          <div className="mb-8 space-y-6">
            <h2 className="text-2xl font-semibold">Memories</h2>

            {/* Timeline */}
            {settings.show_timeline && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {data.memories.slice(0, 25).map((memory) => {
                      const dateLabel = memory.visit_date
                        ? new Date(memory.visit_date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                          })
                        : memory.approximate_year
                          ? String(memory.approximate_year)
                          : "";

                      return (
                        <div
                          key={memory.id}
                          className="flex items-start justify-between gap-4 border-b last:border-b-0 pb-3 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {memory.country_name || "Unknown"}
                            </p>
                            {memory.trip_name && (
                              <p className="text-sm text-muted-foreground truncate">
                                {memory.trip_name}
                              </p>
                            )}
                            {memory.highlight && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {memory.highlight}
                              </p>
                            )}
                          </div>
                          {dateLabel && (
                            <div className="text-sm text-muted-foreground whitespace-nowrap">
                              {dateLabel}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {data.memories.length > 25 && (
                      <p className="text-xs text-muted-foreground">
                        Showing the latest 25 visits.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photo Gallery */}
            {settings.show_photos && photos.length > 0 && (
              <PublicPhotoGallery countries={countries} photos={photos} />
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <Card className="bg-gradient-to-r from-primary/5 via-background to-secondary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <Globe className="h-10 w-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Own Travel Journey</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Track your family's adventures, discover new destinations, and create lasting
              memories together.
            </p>
            <Link to="/auth">
              <Button size="lg">
                Sign Up for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicDashboard;
