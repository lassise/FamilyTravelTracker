import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, Search, Compass, MapPin, Globe, Sparkles, 
  TrendingUp, Heart, Star, ArrowRight, Filter, 
  Mountain, Waves, Building, TreePine, Plane, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { countries as allCountriesData } from "countries-list";

type Category = 'all' | 'trending' | 'adventure' | 'beach' | 'city' | 'nature' | 'cultural';

interface DestinationCard {
  name: string;
  flag: string;
  continent: string;
  category: Category[];
  highlights: string[];
  bestFor: string;
  visited: boolean;
  onWishlist: boolean;
}

const categories: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Globe },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'adventure', label: 'Adventure', icon: Mountain },
  { key: 'beach', label: 'Beach', icon: Waves },
  { key: 'city', label: 'City', icon: Building },
  { key: 'nature', label: 'Nature', icon: TreePine },
  { key: 'cultural', label: 'Cultural', icon: Star },
];

// Sample destination data with categories
const destinationData: Record<string, { category: Category[]; highlights: string[]; bestFor: string }> = {
  'Japan': { category: ['trending', 'cultural', 'city'], highlights: ['Ancient temples', 'Cherry blossoms', 'Incredible food'], bestFor: 'Culture & Cuisine' },
  'Iceland': { category: ['adventure', 'nature'], highlights: ['Northern lights', 'Geysers', 'Glaciers'], bestFor: 'Natural Wonders' },
  'Thailand': { category: ['beach', 'cultural', 'trending'], highlights: ['Tropical islands', 'Street food', 'Temples'], bestFor: 'Budget Travel' },
  'Italy': { category: ['cultural', 'city'], highlights: ['Art & history', 'Amazing food', 'Architecture'], bestFor: 'Art & Food' },
  'New Zealand': { category: ['adventure', 'nature'], highlights: ['Stunning landscapes', 'Hiking', 'Adventure sports'], bestFor: 'Outdoor Adventures' },
  'Greece': { category: ['beach', 'cultural'], highlights: ['Island hopping', 'Ancient ruins', 'Mediterranean food'], bestFor: 'History & Beaches' },
  'Costa Rica': { category: ['adventure', 'nature', 'beach'], highlights: ['Rainforests', 'Wildlife', 'Beaches'], bestFor: 'Eco-Tourism' },
  'Morocco': { category: ['cultural', 'adventure'], highlights: ['Souks', 'Sahara desert', 'Riads'], bestFor: 'Exotic Culture' },
  'Portugal': { category: ['beach', 'city', 'trending'], highlights: ['Coastal towns', 'Wine regions', 'Affordability'], bestFor: 'Laid-back Vibes' },
  'Vietnam': { category: ['cultural', 'adventure'], highlights: ['Street food', 'Halong Bay', 'History'], bestFor: 'Food & Scenery' },
  'Norway': { category: ['nature', 'adventure'], highlights: ['Fjords', 'Northern lights', 'Hiking'], bestFor: 'Dramatic Landscapes' },
  'Peru': { category: ['adventure', 'cultural'], highlights: ['Machu Picchu', 'Amazon', 'Cuisine'], bestFor: 'Ancient Wonders' },
  'Australia': { category: ['beach', 'adventure', 'nature'], highlights: ['Great Barrier Reef', 'Outback', 'Wildlife'], bestFor: 'Diverse Experiences' },
  'Spain': { category: ['beach', 'city', 'cultural'], highlights: ['Beaches', 'Tapas', 'Architecture'], bestFor: 'Sun & Culture' },
  'Switzerland': { category: ['nature', 'adventure'], highlights: ['Alps', 'Scenic trains', 'Chocolate'], bestFor: 'Mountain Views' },
  'Mexico': { category: ['beach', 'cultural', 'trending'], highlights: ['Beaches', 'Ancient ruins', 'Cuisine'], bestFor: 'Beach & History' },
  'Croatia': { category: ['beach', 'city'], highlights: ['Adriatic coast', 'Old towns', 'Islands'], bestFor: 'Coastal Beauty' },
  'South Africa': { category: ['adventure', 'nature'], highlights: ['Safari', 'Cape Town', 'Diverse landscapes'], bestFor: 'Wildlife' },
  'Canada': { category: ['nature', 'adventure', 'city'], highlights: ['National parks', 'Cities', 'Northern lights'], bestFor: 'Nature & Cities' },
  'France': { category: ['cultural', 'city'], highlights: ['Paris', 'Wine regions', 'Cuisine'], bestFor: 'Romance & Culture' },
};

const Explore = () => {
  const { user, loading: authLoading } = useAuth();
  const { countries, wishlist, loading } = useFamilyData();
  const { preferences } = useTravelPreferences();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0).map(c => c.name);
  const wishlistCountries = countries.filter(c => wishlist.includes(c.id)).map(c => c.name);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const generateAiRecommendations = async () => {
    setLoadingAi(true);
    try {
      const { data } = await supabase.functions.invoke("generate-trip-suggestions", {
        body: {
          preferences: preferences ? {
            travel_style: preferences.travel_style,
            interests: preferences.interests,
            budget: preferences.budget_preference,
            liked_countries: preferences.liked_countries,
            disliked_countries: preferences.disliked_countries,
          } : null,
          visited_countries: visitedCountries,
          request_type: "quick_explore",
        },
      });
      
      if (data?.recommendations) {
        setAiRecommendations(data.recommendations.map((r: any) => r.country));
      }
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
    } finally {
      setLoadingAi(false);
    }
  };

  // Build destination cards
  const destinations: DestinationCard[] = Object.entries(destinationData).map(([name, data]) => {
    const countryEntry = Object.entries(allCountriesData).find(([, c]) => c.name === name);
    const flag = countryEntry ? String.fromCodePoint(...countryEntry[0].split('').map(c => c.charCodeAt(0) + 127397)) : '🌍';
    const continent = countryEntry ? (allCountriesData as any)[countryEntry[0]]?.continent || 'Unknown' : 'Unknown';
    
    return {
      name,
      flag,
      continent,
      category: data.category,
      highlights: data.highlights,
      bestFor: data.bestFor,
      visited: visitedCountries.includes(name),
      onWishlist: wishlistCountries.includes(name),
    };
  });

  // Filter destinations
  const filteredDestinations = destinations.filter(d => {
    const matchesCategory = activeCategory === 'all' || d.category.includes(activeCategory);
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (authLoading || loading) {
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
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
                <Compass className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Discover Your Next Adventure</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Explore Destinations
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Find inspiration for your next family trip from around the world
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search destinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 rounded-full border-2 border-border focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                      activeCategory === cat.key
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* AI Recommendations Section */}
          <Card className="mb-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Picks For You
              </CardTitle>
              <Button onClick={generateAiRecommendations} disabled={loadingAi} size="sm">
                {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {loadingAi ? "Thinking..." : "Get Personalized Picks"}
              </Button>
            </CardHeader>
            <CardContent>
              {aiRecommendations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {aiRecommendations.map((country, i) => (
                    <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3">
                      {country}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Click the button to get AI recommendations based on your travel preferences and history.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Your Progress */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card">
              <CardContent className="p-4 text-center">
                <Globe className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold text-foreground">{visitedCountries.length}</div>
                <div className="text-xs text-muted-foreground">Countries Visited</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4 text-center">
                <Heart className="h-6 w-6 mx-auto mb-2 text-destructive" />
                <div className="text-2xl font-bold text-foreground">{wishlistCountries.length}</div>
                <div className="text-xs text-muted-foreground">On Wishlist</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4 text-center">
                <Plane className="h-6 w-6 mx-auto mb-2 text-secondary" />
                <div className="text-2xl font-bold text-foreground">{195 - visitedCountries.length}</div>
                <div className="text-xs text-muted-foreground">Left to Explore</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4 text-center">
                <Sun className="h-6 w-6 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold text-foreground">{Math.round((visitedCountries.length / 195) * 100)}%</div>
                <div className="text-xs text-muted-foreground">World Explored</div>
              </CardContent>
            </Card>
          </div>

          {/* Destinations Grid */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {activeCategory === 'all' ? 'Popular Destinations' : `${categories.find(c => c.key === activeCategory)?.label} Destinations`}
            </h2>
            <span className="text-sm text-muted-foreground">{filteredDestinations.length} destinations</span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDestinations.map((dest) => (
              <Card 
                key={dest.name} 
                className={cn(
                  "group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden",
                  dest.visited && "ring-2 ring-primary/50",
                  dest.onWishlist && !dest.visited && "ring-2 ring-destructive/50"
                )}
                onClick={() => navigate(`/trips/new?destination=${encodeURIComponent(dest.name)}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{dest.flag}</span>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {dest.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{dest.bestFor}</p>
                      </div>
                    </div>
                    {dest.visited && (
                      <Badge variant="default" className="text-xs">Visited</Badge>
                    )}
                    {dest.onWishlist && !dest.visited && (
                      <Heart className="h-4 w-4 text-destructive fill-destructive" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dest.category.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  
                  <ul className="space-y-1">
                    {dest.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-primary/60" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 flex items-center text-xs text-primary font-medium group-hover:translate-x-1 transition-transform">
                    Plan a trip <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDestinations.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No destinations found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Explore;
