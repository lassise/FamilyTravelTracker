import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, MapPin, Calendar, Trophy, Plane, Star, 
  ChevronRight, ChevronLeft, Home, Sparkles, Award,
  Map, Clock, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const YearWrapped = () => {
  const { user, loading: authLoading } = useAuth();
  const { countries, familyMembers, totalContinents } = useFamilyData();
  const { visitDetails } = useVisitDetails();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  // Calculate stats for the year
  const yearVisits = visitDetails.filter(v => {
    if (v.visit_date) {
      return new Date(v.visit_date).getFullYear() === previousYear;
    }
    if (v.approximate_year) {
      return v.approximate_year === previousYear;
    }
    return false;
  });

  const uniqueCountriesThisYear = [...new Set(yearVisits.map(v => v.country_id))];
  const totalDaysThisYear = yearVisits.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
  const tripsThisYear = yearVisits.length;

  // Get country names for visited countries
  const visitedCountryDetails = uniqueCountriesThisYear.map(id => 
    countries.find(c => c.id === id)
  ).filter(Boolean);

  // Find most visited continent
  const continentCounts: Record<string, number> = {};
  visitedCountryDetails.forEach(country => {
    if (country) {
      continentCounts[country.continent] = (continentCounts[country.continent] || 0) + 1;
    }
  });
  const favoriteContinent = Object.entries(continentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None yet";

  // Slides content
  const slides = [
    // Intro slide
    {
      id: "intro",
      bg: "bg-gradient-to-br from-primary via-secondary to-accent",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Sparkles className="h-20 w-20 text-primary-foreground mb-6" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold text-primary-foreground mb-4"
          >
            Your {previousYear}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl text-primary-foreground/80"
          >
            Travel Wrapped
          </motion.p>
        </div>
      ),
    },
    // Countries visited
    {
      id: "countries",
      bg: "bg-gradient-to-br from-emerald-600 to-teal-800",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Globe className="h-24 w-24 text-white/90 mb-6" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white/80 mb-2"
          >
            In {previousYear}, you explored
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-8xl md:text-9xl font-bold text-white mb-4"
          >
            {uniqueCountriesThisYear.length}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-2xl text-white/90"
          >
            {uniqueCountriesThisYear.length === 1 ? "country" : "countries"}
          </motion.p>
          {visitedCountryDetails.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-wrap gap-2 justify-center mt-8 max-w-md"
            >
              {visitedCountryDetails.slice(0, 8).map((country, i) => (
                <Badge key={i} variant="secondary" className="text-lg px-4 py-1 bg-white/20 text-white border-none">
                  {country?.flag} {country?.name}
                </Badge>
              ))}
              {visitedCountryDetails.length > 8 && (
                <Badge variant="secondary" className="text-lg px-4 py-1 bg-white/20 text-white border-none">
                  +{visitedCountryDetails.length - 8} more
                </Badge>
              )}
            </motion.div>
          )}
        </div>
      ),
    },
    // Days on the road
    {
      id: "days",
      bg: "bg-gradient-to-br from-amber-500 to-orange-700",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <Calendar className="h-24 w-24 text-white/90 mb-6" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white/80 mb-2"
          >
            You spent
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-8xl md:text-9xl font-bold text-white mb-4"
          >
            {totalDaysThisYear}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-2xl text-white/90"
          >
            days exploring the world
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-lg text-white/70 mt-4"
          >
            That's {Math.round((totalDaysThisYear / 365) * 100)}% of the year!
          </motion.p>
        </div>
      ),
    },
    // Trips taken
    {
      id: "trips",
      bg: "bg-gradient-to-br from-violet-600 to-purple-800",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ rotate: -45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <Plane className="h-24 w-24 text-white/90 mb-6" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white/80 mb-2"
          >
            You went on
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-8xl md:text-9xl font-bold text-white mb-4"
          >
            {tripsThisYear}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-2xl text-white/90"
          >
            {tripsThisYear === 1 ? "adventure" : "adventures"}
          </motion.p>
        </div>
      ),
    },
    // Favorite continent
    {
      id: "continent",
      bg: "bg-gradient-to-br from-rose-500 to-pink-700",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <Map className="h-24 w-24 text-white/90 mb-6" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white/80 mb-2"
          >
            Your favorite continent was
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-5xl md:text-6xl font-bold text-white mb-4"
          >
            {favoriteContinent}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-lg text-white/70"
          >
            across {totalContinents} continents explored overall
          </motion.p>
        </div>
      ),
    },
    // Family travelers
    {
      id: "family",
      bg: "bg-gradient-to-br from-cyan-500 to-blue-700",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <Users className="h-24 w-24 text-white/90 mb-6" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white/80 mb-4"
          >
            Adventures shared with
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-3 justify-center max-w-md"
          >
            {familyMembers.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex flex-col items-center bg-white/20 rounded-xl p-4"
              >
                <span className="text-4xl mb-2">{member.avatar}</span>
                <span className="text-white font-medium">{member.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ),
    },
    // Summary slide
    {
      id: "summary",
      bg: "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600",
      content: (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring" }}
          >
            <Trophy className="h-24 w-24 text-yellow-400 mb-6" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-white mb-8"
          >
            Your {previousYear} in Review
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4 max-w-md w-full"
          >
            <Card className="bg-white/20 border-none p-4 text-center">
              <Globe className="h-8 w-8 text-white mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{uniqueCountriesThisYear.length}</p>
              <p className="text-white/80 text-sm">Countries</p>
            </Card>
            <Card className="bg-white/20 border-none p-4 text-center">
              <Calendar className="h-8 w-8 text-white mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{totalDaysThisYear}</p>
              <p className="text-white/80 text-sm">Days</p>
            </Card>
            <Card className="bg-white/20 border-none p-4 text-center">
              <Plane className="h-8 w-8 text-white mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{tripsThisYear}</p>
              <p className="text-white/80 text-sm">Trips</p>
            </Card>
            <Card className="bg-white/20 border-none p-4 text-center">
              <Map className="h-8 w-8 text-white mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{totalContinents}</p>
              <p className="text-white/80 text-sm">Continents</p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate("/travel-history")}
            >
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </motion.div>
        </div>
      ),
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className={cn("min-h-screen", slides[currentSlide].bg)}
        >
          {slides[currentSlide].content}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="bg-white/20 hover:bg-white/30 text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSlide ? "bg-white w-6" : "bg-white/40"
              )}
            />
          ))}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="bg-white/20 hover:bg-white/30 text-white disabled:opacity-30"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Skip button */}
      <Button
        variant="ghost"
        className="fixed top-4 right-4 text-white/70 hover:text-white z-50"
        onClick={() => navigate("/travel-history")}
      >
        Skip
      </Button>
    </div>
  );
};

export default YearWrapped;
