import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, ArrowRight, Calendar, MapPin, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import CountryFlag from "@/components/common/CountryFlag";
import { getEffectiveFlagCode } from "@/lib/countriesData";

// Types for the RPC response
interface ShareSettings {
  show_stats: boolean;
  show_map: boolean;
  show_countries: boolean;
  show_photos: boolean;
  show_timeline: boolean;
  show_family_members: boolean;
  show_achievements: boolean;
  show_wishlist: boolean;
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
}

interface CountryVisit {
  country_id: string;
  family_member_id: string | null;
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  color: string;
}

interface VisitDetail {
  id: string;
  country_id: string;
  visit_date: string | null;
  approximate_year: number | null;
  approximate_month: number | null;
  is_approximate: boolean | null;
  trip_name: string | null;
  highlight: string | null;
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
  family_member_id: string | null;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  country_id: string | null;
  taken_at: string | null;
}

interface DashboardData {
  success: boolean;
  error?: string;
  message?: string;
  shareSettings: ShareSettings;
  profile: UserProfile;
  countries: Country[];
  countryVisits: CountryVisit[];
  familyMembers: FamilyMember[];
  visitDetails: VisitDetail[];
  visitFamilyMembers: VisitFamilyMember[];
  stateVisits: StateVisit[];
  photos: Photo[];
  wishlist: { country_id: string }[];
}

const SharedDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const resolvedHome = useHomeCountry(data?.profile?.home_country || null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        // Single RPC call to get ALL data
        const { data: result, error: rpcError } = await supabase
          .rpc('get_shared_dashboard_data', { p_share_token: token });

        if (rpcError) {
          console.error("RPC error:", rpcError);
          setError("Failed to load dashboard");
          setLoading(false);
          return;
        }

        // Type guard for the result
        const typedResult = result as unknown as DashboardData | { error: string; message: string };
        
        if (!typedResult || 'error' in typedResult) {
          setError((typedResult as { message?: string })?.message || "Dashboard not found or is private");
          setLoading(false);
          return;
        }

        setData(typedResult as DashboardData);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Build countries with visitedBy info
  const countriesWithVisits = useMemo(() => {
    if (!data) return [];
    
    const visitedByMap = new Map<string, Set<string>>();
    
    // From country_visits
    data.countryVisits.forEach(visit => {
      if (!visit.country_id) return;
      if (!visitedByMap.has(visit.country_id)) {
        visitedByMap.set(visit.country_id, new Set());
      }
      if (data.shareSettings.show_family_members && visit.family_member_id) {
        const member = data.familyMembers.find(m => m.id === visit.family_member_id);
        if (member) visitedByMap.get(visit.country_id)!.add(member.name);
      } else {
        visitedByMap.get(visit.country_id)!.add("Visited");
      }
    });

    // From visit_family_members
    const visitToCountry = new Map<string, string>();
    data.visitDetails.forEach(vd => {
      if (vd.id && vd.country_id) visitToCountry.set(vd.id, vd.country_id);
    });

    data.visitFamilyMembers.forEach(vfm => {
      const countryId = visitToCountry.get(vfm.visit_id);
      if (!countryId) return;
      if (!visitedByMap.has(countryId)) visitedByMap.set(countryId, new Set());
      if (data.shareSettings.show_family_members && vfm.family_member_id) {
        const member = data.familyMembers.find(m => m.id === vfm.family_member_id);
        if (member) visitedByMap.get(countryId)!.add(member.name);
      } else {
        visitedByMap.get(countryId)!.add("Visited");
      }
    });

    return data.countries.map(c => ({
      ...c,
      visitedBy: Array.from(visitedByMap.get(c.id) || [])
    }));
  }, [data]);

  // Visited countries (excluding home)
  const visitedCountries = useMemo(() => 
    countriesWithVisits.filter(c => c.visitedBy.length > 0 && !resolvedHome.isHomeCountry(c.name)),
    [countriesWithVisits, resolvedHome]
  );

  // Total continents
  const totalContinents = useMemo(() => {
    const continents = new Set(visitedCountries.map(c => c.continent));
    return continents.size;
  }, [visitedCountries]);

  // Earliest year
  const earliestYear = useMemo(() => {
    if (!data?.visitDetails.length) return null;
    let earliest: number | null = null;
    
    data.visitDetails.forEach(vd => {
      let year: number | null = null;
      if (vd.visit_date) {
        year = new Date(vd.visit_date).getFullYear();
      } else if (vd.approximate_year) {
        year = vd.approximate_year;
      }
      if (year && (!earliest || year < earliest)) {
        earliest = year;
      }
    });
    
    return earliest;
  }, [data?.visitDetails]);

  // State visits count for home country
  const statesVisitedCount = useMemo(() => {
    if (!data?.stateVisits || !resolvedHome.iso2) return 0;
    const uniqueStates = new Set(
      data.stateVisits
        .filter(sv => sv.country_code === resolvedHome.iso2)
        .map(sv => sv.state_code)
    );
    return uniqueStates.size;
  }, [data?.stateVisits, resolvedHome.iso2]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Not Available</h2>
            <p className="text-muted-foreground mb-6">{error || "This dashboard is not available"}</p>
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
      </div>
    );
  }

  const settings = data.shareSettings;

  return (
    <div className="min-h-screen bg-background">
      {/* CTA Banner */}
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

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {data.profile?.full_name || "Traveler"}'s Travel Dashboard
          </h1>
          <p className="text-muted-foreground">
            Explore their adventures and travel statistics.
          </p>
        </div>

        {/* Stats Summary */}
        {settings.show_stats && (
          <Card className="mb-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Countries */}
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-background/60 backdrop-blur-sm">
                  <div className="p-2 rounded-full bg-primary/10 mb-2">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-2xl font-bold">{visitedCountries.length}</span>
                  <span className="text-xs text-muted-foreground">Countries</span>
                </div>

                {/* States (if applicable) */}
                {resolvedHome.hasStateTracking && statesVisitedCount > 0 && (
                  <div className="flex flex-col items-center text-center p-3 rounded-xl bg-background/60 backdrop-blur-sm">
                    <div className="p-2 rounded-full bg-accent/10 mb-2">
                      <CountryFlag countryCode={resolvedHome.iso2 || ""} countryName="Home" size="sm" />
                    </div>
                    <span className="text-2xl font-bold">{statesVisitedCount}</span>
                    <span className="text-xs text-muted-foreground">States</span>
                  </div>
                )}

                {/* Continents */}
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-background/60 backdrop-blur-sm">
                  <div className="p-2 rounded-full bg-secondary/10 mb-2">
                    <MapPin className="h-5 w-5 text-secondary" />
                  </div>
                  <span className="text-2xl font-bold">{totalContinents}</span>
                  <span className="text-xs text-muted-foreground">Continents</span>
                </div>

                {/* Since */}
                {earliestYear && (
                  <div className="flex flex-col items-center text-center p-3 rounded-xl bg-background/60 backdrop-blur-sm">
                    <div className="p-2 rounded-full bg-muted mb-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-2xl font-bold">'{earliestYear.toString().slice(-2)}</span>
                    <span className="text-xs text-muted-foreground">Since</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>World exploration</span>
                  <span>{Math.round((visitedCountries.length / 195) * 100)}% complete</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ width: `${Math.min((visitedCountries.length / 195) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Countries List */}
        {settings.show_countries && visitedCountries.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Countries Visited ({visitedCountries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {visitedCountries
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(country => {
                    const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                    return (
                      <div
                        key={country.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-xl">
                          {isSubdivision || code ? (
                            <CountryFlag countryCode={code} countryName={country.name} size="md" />
                          ) : (
                            country.flag
                          )}
                        </span>
                        <span className="text-sm font-medium truncate">{country.name}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {settings.show_timeline && data.visitDetails.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Travel Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {data.visitDetails.slice(0, 50).map(visit => {
                    const country = data.countries.find(c => c.id === visit.country_id);
                    const dateLabel = visit.visit_date
                      ? new Date(visit.visit_date).toLocaleDateString(undefined, { year: "numeric", month: "short" })
                      : visit.approximate_year
                        ? `${visit.approximate_month ? `${visit.approximate_month}/` : ""}${visit.approximate_year}`
                        : "";

                    return (
                      <div 
                        key={visit.id} 
                        className="flex items-start justify-between gap-4 border-b last:border-b-0 pb-3 last:pb-0"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {country && (
                            <span className="text-xl flex-shrink-0">
                              {(() => {
                                const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                                return isSubdivision || code ? (
                                  <CountryFlag countryCode={code} countryName={country.name} size="md" />
                                ) : (
                                  country.flag
                                );
                              })()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{country?.name || "Unknown"}</p>
                            {visit.trip_name && (
                              <p className="text-sm text-muted-foreground truncate">{visit.trip_name}</p>
                            )}
                            {visit.highlight && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{visit.highlight}</p>
                            )}
                          </div>
                        </div>
                        {dateLabel && (
                          <div className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {dateLabel}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {data.visitDetails.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 50 of {data.visitDetails.length} visits
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {settings.show_photos && data.photos.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                Memories ({data.photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.photos.slice(0, 12).map(photo => (
                  <div 
                    key={photo.id} 
                    className="aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    <img 
                      src={photo.photo_url} 
                      alt={photo.caption || "Travel photo"} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              {data.photos.length > 12 && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Showing 12 of {data.photos.length} photos
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bottom CTA */}
        <Card className="bg-gradient-to-r from-primary/5 via-background to-secondary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <Globe className="h-10 w-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Start Your Own Travel Journey
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Track your family's adventures, discover new destinations, and create lasting memories together.
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

export default SharedDashboard;
