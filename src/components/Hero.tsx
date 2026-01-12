import { Plane } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";

interface HeroProps {
  totalCountries: number;
  totalContinents: number;
  totalMembers: number;
}

const Hero = ({ totalCountries, totalContinents, totalMembers }: HeroProps) => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-secondary/70 to-background/95" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-6 py-2 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Plane className="w-5 h-5 text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground">Travel Adventures</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
          Travel Tracker
        </h1>
        
        <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          Tracking adventures across the globe, one country at a time
        </p>
        
        <div className="flex flex-wrap gap-8 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-border/50 min-w-[150px]">
            <div className="text-4xl font-bold text-primary mb-2">{totalCountries}</div>
            <div className="text-sm text-muted-foreground">Countries Visited</div>
          </div>
          <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-border/50 min-w-[150px]">
            <div className="text-4xl font-bold text-accent mb-2">{totalContinents}</div>
            <div className="text-sm text-muted-foreground">Continents Visited</div>
          </div>
          {totalMembers > 1 && (
            <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-border/50 min-w-[150px]">
              <div className="text-4xl font-bold text-secondary mb-2">{totalMembers}</div>
              <div className="text-sm text-muted-foreground">Travelers</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
