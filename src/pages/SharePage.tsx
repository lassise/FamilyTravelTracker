import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Globe, ArrowRight, MapPin, Plane, Camera, Users, Calendar, CheckCircle2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import CountryFlag from "@/components/common/CountryFlag";
import { getSubdivisionsForCountry, getSubdivisionLabel } from "@/lib/allSubdivisionsData";
import StateGridSelector from "@/components/travel/StateGridSelector";

// Type definitions matching edge function response
interface SharedDashboardData {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    home_country: string | null;
  };
  visitedCountries: Array<{
    id: string;
    name: string;
    flag: string;
    continent: string;
    iso2: string;
  }>;
  visitedCountryCodes: string[];
  visitedContinents: string[];
  wishlistCountries: Array<{
    id: string;
    name: string;
    flag: string;
    continent: string;
    iso2: string;
  }>;
  wishlistCountryCodes: string[];
  visitedStates: Array<{
    id: string;
    state_code: string;
    state_name: string;
    country_code: string;
  }>;
  familyMembers: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    color: string;
    countriesVisited: number;
  }>;
  visitDetails: Array<{
    id: string;
    country_id: string;
    visit_date: string | null;
    approximate_year: number | null;
    approximate_month: number | null;
    is_approximate: boolean | null;
    trip_name: string | null;
    highlight: string | null;
  }>;
  memories: Array<{
    id: string;
    photo_url: string;
    caption: string | null;
    country_id: string | null;
    taken_at: string | null;
  }>;
  sinceYear: number | null;
  counts: {
    visitedCountries: number;
    visitedStates: number;
    visitedContinents: number;
    wishlistCountries: number;
    memories: number;
  };
  mapboxToken: string | null;
}

interface DebugInfo {
  token_normalized: string;
  token_found: boolean;
  is_active: boolean;
  owner_user_id: string | null;
  owner_found: boolean;
  query_counts: {
    visitedCountries: number;
    visitedStates: number;
    visitedContinents: number;
    wishlistCountries: number;
    memories: number;
    familyMembers: number;
  };
  visited_source_tables: string[];
  reason?: string;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  debug: DebugInfo;
  data?: SharedDashboardData;
}

// ISO3 to ISO2 mapping for home country display
const iso3ToIso2: Record<string, string> = {
  USA: "US", GBR: "GB", CAN: "CA", AUS: "AU", DEU: "DE", FRA: "FR", ITA: "IT", ESP: "ES",
  JPN: "JP", CHN: "CN", IND: "IN", BRA: "BR", MEX: "MX", NLD: "NL", BEL: "BE", CHE: "CH",
};

// Read-only state map dialog for public view
const PublicStateDialog = ({
  open,
  onOpenChange,
  countryCode,
  countryName,
  visitedStates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryCode: string;
  countryName: string;
  visitedStates: Array<{ state_code: string; state_name: string }>;
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const states = useMemo(() => {
    const allStates = getSubdivisionsForCountry(countryCode);
    if (!allStates) return null;

    // Filter for US 50 states
    if (countryCode === "US") {
      const us50 = new Set([
        "US-AL", "US-AK", "US-AZ", "US-AR", "US-CA", "US-CO", "US-CT", "US-DE", "US-FL", "US-GA",
        "US-HI", "US-ID", "US-IL", "US-IN", "US-IA", "US-KS", "US-KY", "US-LA", "US-ME", "US-MD",
        "US-MA", "US-MI", "US-MN", "US-MS", "US-MO", "US-MT", "US-NE", "US-NV", "US-NH", "US-NJ",
        "US-NM", "US-NY", "US-NC", "US-ND", "US-OH", "US-OK", "US-OR", "US-PA", "US-RI", "US-SC",
        "US-SD", "US-TN", "US-TX", "US-UT", "US-VT", "US-VA", "US-WA", "US-WV", "US-WI", "US-WY",
      ]);
      const filtered: Record<string, string> = {};
      Object.entries(allStates).forEach(([code, name]) => {
        if (us50.has(code)) filtered[code] = name;
      });
      return Object.fromEntries(Object.entries(filtered).sort(([, a], [, b]) => a.localeCompare(b)));
    }

    return Object.fromEntries(Object.entries(allStates).sort(([, a], [, b]) => a.localeCompare(b)));
  }, [countryCode]);

  const filteredStates = useMemo(() => {
    if (!states) return null;
    if (!searchQuery.trim()) return states;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, string> = {};
    Object.entries(states).forEach(([code, name]) => {
      if (name.toLowerCase().includes(q) || code.toLowerCase().includes(q)) filtered[code] = name;
    });
    return filtered;
  }, [states, searchQuery]);

  const visitedSet = useMemo(
    () => new Set(visitedStates.map((s) => s.state_code)),
    [visitedStates]
  );

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  if (!states) return null;

  const totalCount = Object.keys(states).length;
  const visitedCount = visitedSet.size;
  const regionLabel = getSubdivisionLabel(countryCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-full bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={countryCode} countryName={countryName} size="lg" />
                <span>{countryName}</span>
              </div>
              <p className="text-sm text-muted-foreground font-normal mt-0.5">
                Read-only view of visited {regionLabel.toLowerCase()}.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${regionLabel.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Badge variant="default" className="text-sm px-3 py-1 bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {visitedCount} / {totalCount}
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[calc(90vh-280px)] min-h-[300px]">
            <div className="pr-4">
              {filteredStates && Object.keys(filteredStates).length > 0 ? (
                <StateGridSelector
                  states={filteredStates}
                  selectedStates={visitedSet}
                  onStateClick={() => toast.info("Read-only: sign in to edit")}
                  countryCode={countryCode}
                />
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No {regionLabel.toLowerCase()} found matching "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [data, setData] = useState<SharedDashboardData | null>(null);
  
  // State dialog
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) {
        setError("No share token provided");
        setLoading(false);
        return;
      }

      try {
        // EXACTLY ONE REQUEST to the edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-dashboard`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ token }),
          }
        );

        const result: ApiResponse = await response.json();
        
        setDebug(result.debug);

        if (!result.ok || !result.data) {
          console.error("Share dashboard fetch failed:", result);
          setError(result.error || "Link not available");
          setLoading(false);
          return;
        }

        setData(result.data);
        setLoading(false);
      } catch (err) {
        console.error("Share dashboard fetch exception:", err);
        setError("Failed to load dashboard");
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token]);

  // Get states for selected country
  const selectedCountryStates = useMemo(() => {
    if (!selectedCountry || !data) return [];
    return data.visitedStates.filter((s) => s.country_code === selectedCountry.code);
  }, [selectedCountry, data]);

  // Handle country click for state drilldown
  const handleCountryClick = useCallback((country: { iso2: string; name: string }) => {
    if (!country.iso2) return;
    const states = getSubdivisionsForCountry(country.iso2);
    if (states) {
      setSelectedCountry({ code: country.iso2, name: country.name });
      setStateDialogOpen(true);
    }
  }, []);

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
            <p className="text-muted-foreground mb-4">{error || "This share link is not valid."}</p>
            
            {debug && (
              <details className="text-left text-xs bg-muted p-3 rounded mb-4">
                <summary className="cursor-pointer font-medium">Debug Info</summary>
                <pre className="mt-2 overflow-auto">{JSON.stringify(debug, null, 2)}</pre>
              </details>
            )}

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

  const { profile, counts, visitedCountries, wishlistCountries, visitedContinents, familyMembers, visitDetails, memories, sinceYear } = data;

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

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xl bg-primary/10">
              {profile.full_name?.charAt(0) || "T"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {profile.full_name || "Traveler"}'s Travel Dashboard
            </h1>
            <p className="text-muted-foreground">
              {sinceYear ? `Exploring the world since ${sinceYear}` : "Exploring the world"}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-3xl font-bold">{counts.visitedCountries}</div>
              <p className="text-sm text-muted-foreground">Countries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <div className="text-3xl font-bold">{counts.visitedStates}</div>
              <p className="text-sm text-muted-foreground">States/Regions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Plane className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-3xl font-bold">{counts.visitedContinents}</div>
              <p className="text-sm text-muted-foreground">Continents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <div className="text-3xl font-bold">{sinceYear || "—"}</div>
              <p className="text-sm text-muted-foreground">Since</p>
            </CardContent>
          </Card>
        </div>

        {/* Visited Countries */}
        {visitedCountries.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Countries Visited ({counts.visitedCountries})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {visitedCountries.map((country) => (
                  <Badge
                    key={country.id}
                    variant="secondary"
                    className="text-sm px-3 py-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => handleCountryClick(country)}
                  >
                    <span className="mr-1.5">{country.flag}</span>
                    {country.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wishlist */}
        {wishlistCountries.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Wishlist ({counts.wishlistCountries})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {wishlistCountries.map((country) => (
                  <Badge key={country.id} variant="outline" className="text-sm px-3 py-1">
                    <span className="mr-1.5">{country.flag}</span>
                    {country.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Members */}
        {familyMembers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10" style={{ borderColor: member.color, borderWidth: 2 }}>
                      <AvatarFallback style={{ backgroundColor: member.color + "20" }}>
                        {member.avatar || member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.countriesVisited} countries</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memories / Timeline */}
        {visitDetails.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Travel Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visitDetails.slice(0, 20).map((visit) => {
                  const country = visitedCountries.find((c) => c.id === visit.country_id);
                  const dateLabel = visit.visit_date
                    ? new Date(visit.visit_date).toLocaleDateString(undefined, { year: "numeric", month: "short" })
                    : visit.approximate_year
                      ? `${visit.approximate_month ? `${visit.approximate_month}/` : ""}${visit.approximate_year}`
                      : "";

                  return (
                    <div key={visit.id} className="flex items-start justify-between gap-4 border-b last:border-b-0 pb-3 last:pb-0">
                      <div className="min-w-0 flex items-center gap-2">
                        {country && <span>{country.flag}</span>}
                        <div>
                          <p className="font-medium truncate">{country?.name || "Unknown"}</p>
                          {visit.trip_name && (
                            <p className="text-sm text-muted-foreground truncate">{visit.trip_name}</p>
                          )}
                          {visit.highlight && (
                            <p className="text-sm text-muted-foreground mt-1">{visit.highlight}</p>
                          )}
                        </div>
                      </div>
                      {dateLabel && (
                        <div className="text-sm text-muted-foreground whitespace-nowrap">{dateLabel}</div>
                      )}
                    </div>
                  );
                })}
                {visitDetails.length > 20 && (
                  <p className="text-xs text-muted-foreground pt-2">Showing the first 20 visits.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {memories.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Memories ({memories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {memories.slice(0, 12).map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || "Travel memory"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              {memories.length > 12 && (
                <p className="text-sm text-muted-foreground mt-4">And {memories.length - 12} more memories...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bottom CTA */}
        <Card className="bg-gradient-to-r from-primary/5 via-background to-secondary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <Globe className="h-10 w-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Own Travel Journey</h3>
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

      {/* State Dialog */}
      {selectedCountry && (
        <PublicStateDialog
          open={stateDialogOpen}
          onOpenChange={setStateDialogOpen}
          countryCode={selectedCountry.code}
          countryName={selectedCountry.name}
          visitedStates={selectedCountryStates}
        />
      )}
    </div>
  );
};

export default SharePage;
