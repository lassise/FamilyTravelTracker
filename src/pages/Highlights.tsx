import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, MapPin, Camera, Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ShareProfile {
  id: string;
  user_id: string;
  is_public: boolean;
  show_photos: boolean;
  show_stats: boolean;
  show_map: boolean;
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

interface TravelPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  country_id: string;
}

const Highlights = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareProfile, setShareProfile] = useState<ShareProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [visitedCountryIds, setVisitedCountryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      // Fetch share profile
      const { data: shareData, error: shareError } = await supabase
        .from("share_profiles")
        .select("*")
        .eq("share_token", token)
        .single();

      if (shareError || !shareData) {
        setError("Profile not found or is private");
        setLoading(false);
        return;
      }

      if (!shareData.is_public) {
        setError("This profile is private");
        setLoading(false);
        return;
      }

      setShareProfile(shareData);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, home_country")
        .eq("id", shareData.user_id)
        .single();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch countries visited by this user
      const { data: countriesData } = await supabase
        .from("countries")
        .select("*")
        .eq("user_id", shareData.user_id);

      if (countriesData) {
        setCountries(countriesData);
      }

      // Fetch country visits
      const { data: visitsData } = await supabase
        .from("country_visits")
        .select("country_id")
        .eq("user_id", shareData.user_id);

      if (visitsData) {
        setVisitedCountryIds(new Set(visitsData.map(v => v.country_id).filter(Boolean) as string[]));
      }

      // Fetch photos
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
                <p className="text-4xl font-bold text-primary">{photos.length}+</p>
                <p className="text-sm text-muted-foreground">Memories</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Countries List */}
        {shareProfile?.show_map && visitedCountries.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Places Visited</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {visitedCountries.map((country) => (
                <span
                  key={country.id}
                  className="inline-flex items-center gap-1 bg-card border border-border px-3 py-1.5 rounded-full text-sm"
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Photos Gallery */}
        {shareProfile?.show_photos && photos.length > 0 && (
          <section>
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

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="text-primary font-medium">TravelTracker</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Highlights;
