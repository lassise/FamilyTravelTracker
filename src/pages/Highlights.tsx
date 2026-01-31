import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, MapPin, Camera, Plane, Trophy, Flame, Calendar, Building2, Users, Download, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CountryFlag from "@/components/common/CountryFlag";
import { getEffectiveFlagCode } from "@/lib/countriesData";

interface ShareProfile {
  id: string;
  user_id: string;
  is_public: boolean;
  show_photos: boolean;
  show_stats: boolean;
  show_map: boolean;
  show_countries?: boolean;
  show_cities?: boolean;
  show_achievements?: boolean;
  show_streaks?: boolean;
  show_timeline?: boolean;
  show_family_members?: boolean;
  show_travel_dna?: boolean;
  show_heatmap?: boolean;
  allow_downloads?: boolean;
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
}

interface CountryVisit {
  id: string;
  country_id: string | null;
  visit_date?: string | null;
  number_of_days?: number | null;
}

interface TravelPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  country_id: string;
}

interface CityVisit {
  id: string;
  city_name: string;
  country_id: string;
}

interface HighlightFamilyMember {
  id: string;
  name: string;
  avatar: string | null;
}

const Highlights = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareProfile, setShareProfile] = useState<ShareProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [visits, setVisits] = useState<CountryVisit[]>([]);
  const [cities, setCities] = useState<CityVisit[]>([]);
  const [familyMembers, setFamilyMembers] = useState<HighlightFamilyMember[]>([]);
  const [visitedCountryIds, setVisitedCountryIds] = useState<Set<string>>(new Set());

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      // Fetch share profile using secure function
      const { data: shareDataArr, error: shareError } = await supabase
        .rpc('get_share_profile_by_token', { token });

      if (shareError || !shareDataArr || shareDataArr.length === 0) {
        setError("Profile not found or is private");
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

      // Fetch countries
      const { data: countriesData } = await supabase
        .from("countries")
        .select("*")
        .eq("user_id", shareData.user_id);

      if (countriesData) {
        setCountries(countriesData);
      }

      // Fetch visits
      const { data: visitsData } = await supabase
        .from("country_visits")
        .select("*")
        .eq("user_id", shareData.user_id)
        .order("visit_date", { ascending: false });

      if (visitsData) {
        setVisits(visitsData);
        setVisitedCountryIds(new Set(visitsData.map(v => v.country_id).filter(Boolean) as string[]));
      }

      // Fetch cities if enabled
      if (shareData.show_cities) {
        const { data: citiesData } = await supabase
          .from("city_visits")
          .select("*")
          .eq("user_id", shareData.user_id);

        if (citiesData) {
          setCities(citiesData);
        }
      }

      // Fetch family members if enabled
      if (shareData.show_family_members) {
        const { data: membersData } = await supabase
          .from("family_members")
          .select("*")
          .eq("user_id", shareData.user_id);

        if (membersData) {
          setFamilyMembers(membersData);
        }
      }

      // Fetch photos if enabled
      if (shareData.show_photos) {
        const { data: photosData } = await supabase
          .from("travel_photos")
          .select("*")
          .eq("user_id", shareData.user_id)
          .order("taken_at", { ascending: false })
          .limit(12);

        if (photosData) {
          setPhotos(photosData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [token]);

  const visitedCountries = countries.filter(c => visitedCountryIds.has(c.id));
  const continents = new Set(visitedCountries.map(c => c.continent));
  const totalDays = visits.reduce((sum, v) => sum + (v.number_of_days || 0), 0);

  // Group cities by country
  const citiesByCountry = cities.reduce((acc, city) => {
    if (!acc[city.country_id]) acc[city.country_id] = [];
    acc[city.country_id].push(city);
    return acc;
  }, {} as Record<string, CityVisit[]>);

  // Group visits by year for timeline
  const visitsByYear = visits.reduce((acc, visit) => {
    if (!visit.visit_date) return acc;
    const year = new Date(visit.visit_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(visit);
    return acc;
  }, {} as Record<number, CountryVisit[]>);

  const handleDownloadData = () => {
    if (!shareProfile?.allow_downloads) return;
    
    const data = {
      profile: userProfile,
      countries: visitedCountries,
      visits: visits,
      cities: cities,
      totalDays,
      continents: Array.from(continents),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-highlights-${userProfile?.full_name || 'traveler'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <h2 className="text-xl font-semibold mb-2">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Plane className="h-4 w-4" />
            <span className="text-sm font-medium">Travel Highlights</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {userProfile?.full_name || "A Traveler"}'s Adventures
          </h1>
          {shareProfile?.custom_headline && (
            <p className="text-xl text-muted-foreground">{shareProfile.custom_headline}</p>
          )}

          {/* Social sharing */}
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share this travel map:
            </span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 text-xs font-medium"
            >
              Facebook
            </a>
            <a
              href={`https://x.com/intent/post?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out this family travel map!")}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full bg-black/10 text-black hover:bg-black/20 text-xs font-medium"
            >
              X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 text-xs font-medium"
            >
              LinkedIn
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Check out this family travel map: " + shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 text-xs font-medium"
            >
              WhatsApp
            </a>
          </div>

          {shareProfile?.allow_downloads && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={handleDownloadData}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Data
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Stats */}
        {shareProfile?.show_stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-primary">{visitedCountries.length}</p>
                <p className="text-sm text-muted-foreground">Countries</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-primary">{continents.size}</p>
                <p className="text-sm text-muted-foreground">Continents</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-primary">
                  {Math.round((visitedCountries.length / 195) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">World Explored</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-primary">{totalDays}</p>
                <p className="text-sm text-muted-foreground">Days Abroad</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Family Members */}
        {shareProfile?.show_family_members && familyMembers.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Travel Crew</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {familyMembers.map((member) => (
                <Badge key={member.id} variant="secondary" className="px-4 py-2 text-sm">
                  <span className="mr-2">{member.avatar || "👤"}</span>
                  {member.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Countries List */}
        {shareProfile?.show_countries && visitedCountries.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Places Visited</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {visitedCountries.map((country) => {
                const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                const countryCities = citiesByCountry[country.id] || [];
                
                return (
                  <div key={country.id} className="group">
                    <span className="inline-flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-full text-sm hover:border-primary/50 transition-colors">
                      <span className="inline-flex items-center">
                        {isSubdivision || code ? (
                          <CountryFlag countryCode={code} countryName={country.name} size="sm" />
                        ) : (
                          country.flag
                        )}
                      </span>
                      <span>{country.name}</span>
                      {shareProfile.show_cities && countryCities.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[10px] py-0">
                          {countryCities.length} {countryCities.length === 1 ? 'city' : 'cities'}
                        </Badge>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Cities Section */}
        {shareProfile?.show_cities && cities.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Cities Explored</h2>
              <Badge variant="secondary">{cities.length} cities</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.slice(0, 30).map((city) => (
                <Badge key={city.id} variant="outline" className="text-sm">
                  {city.city_name}
                </Badge>
              ))}
              {cities.length > 30 && (
                <Badge variant="secondary">+{cities.length - 30} more</Badge>
              )}
            </div>
          </section>
        )}

        {/* Timeline */}
        {shareProfile?.show_timeline && Object.keys(visitsByYear).length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Travel Timeline</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(visitsByYear)
                .sort(([a], [b]) => Number(b) - Number(a))
                .slice(0, 5)
                .map(([year, yearVisits]) => {
                  const yearCountries = yearVisits
                    .map(v => countries.find(c => c.id === v.country_id))
                    .filter(Boolean);
                  const uniqueCountries = [...new Map(yearCountries.map(c => [c!.id, c])).values()];
                  
                  return (
                    <Card key={year} className="bg-card/50">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-primary">{year}</span>
                            <span className="text-muted-foreground">
                              {uniqueCountries.length} {uniqueCountries.length === 1 ? 'country' : 'countries'}
                            </span>
                          </div>
                          <div className="flex -space-x-2">
                            {uniqueCountries.slice(0, 5).map((country) => {
                              const { code } = getEffectiveFlagCode(country!.name, country!.flag);
                              return (
                                <div 
                                  key={country!.id}
                                  className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden"
                                >
                                  <CountryFlag countryCode={code} countryName={country!.name} size="sm" />
                                </div>
                              );
                            })}
                            {uniqueCountries.length > 5 && (
                              <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                                +{uniqueCountries.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </section>
        )}

        {/* Achievements placeholder */}
        {shareProfile?.show_achievements && visitedCountries.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Achievements</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visitedCountries.length >= 5 && (
                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                  <CardContent className="pt-4 text-center">
                    <span className="text-3xl">🌍</span>
                    <p className="font-medium mt-2">Globe Trotter</p>
                    <p className="text-xs text-muted-foreground">5+ countries</p>
                  </CardContent>
                </Card>
              )}
              {continents.size >= 3 && (
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
                  <CardContent className="pt-4 text-center">
                    <span className="text-3xl">🗺️</span>
                    <p className="font-medium mt-2">Continental</p>
                    <p className="text-xs text-muted-foreground">3+ continents</p>
                  </CardContent>
                </Card>
              )}
              {totalDays >= 30 && (
                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                  <CardContent className="pt-4 text-center">
                    <span className="text-3xl">✈️</span>
                    <p className="font-medium mt-2">Road Warrior</p>
                    <p className="text-xs text-muted-foreground">30+ days abroad</p>
                  </CardContent>
                </Card>
              )}
              {cities.length >= 10 && (
                <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/30">
                  <CardContent className="pt-4 text-center">
                    <span className="text-3xl">🏙️</span>
                    <p className="font-medium mt-2">City Hopper</p>
                    <p className="text-xs text-muted-foreground">10+ cities</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Travel Streaks */}
        {shareProfile?.show_streaks && visits.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Travel Streaks</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-primary">{Object.keys(visitsByYear).length}</p>
                  <p className="text-sm text-muted-foreground">Years Traveling</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-primary">{visits.length}</p>
                  <p className="text-sm text-muted-foreground">Total Trips</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {visitedCountries.length > 0 ? Math.round(totalDays / visitedCountries.length) : 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Days/Country</p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Photos Gallery */}
        {shareProfile?.show_photos && photos.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Photo Gallery</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden group"
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Travel photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA + Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center space-y-4">
          <div>
            <p className="text-base font-medium text-foreground mb-2">
              Want to track your own travel? Use Family Travel Tracker For Free.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-1"
            >
              <a href="/auth">
                Start for free
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Powered by <span className="text-primary font-medium">TravelTracker</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Highlights;
