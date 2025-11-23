import Hero from "@/components/Hero";
import FamilyMember from "@/components/FamilyMember";
import CountryTracker from "@/components/CountryTracker";
import Recommendations from "@/components/Recommendations";

const Index = () => {
  const familyMembers = [
    {
      name: "Mom",
      role: "Chief Planner",
      countriesVisited: 42,
      avatar: "👩",
      color: "bg-gradient-to-r from-primary to-primary/60"
    },
    {
      name: "Dad",
      role: "Adventure Seeker",
      countriesVisited: 38,
      avatar: "👨",
      color: "bg-gradient-to-r from-secondary to-secondary/60"
    },
    {
      name: "Alex",
      role: "Young Explorer",
      countriesVisited: 25,
      avatar: "🧒",
      color: "bg-gradient-to-r from-accent to-accent/60"
    },
    {
      name: "Sophie",
      role: "Culture Enthusiast",
      countriesVisited: 22,
      avatar: "👧",
      color: "bg-gradient-to-r from-primary to-secondary"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Meet Our Family
          </h2>
          <p className="text-muted-foreground text-lg">
            Four adventurers exploring the world together
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {familyMembers.map((member) => (
            <FamilyMember key={member.name} {...member} />
          ))}
        </div>
      </section>

      <CountryTracker />
      <Recommendations />
      
      <footer className="py-12 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-2 text-foreground">Family on the Fly</h3>
          <p className="text-muted-foreground">
            Follow our adventures on Instagram @FamilyOnTheFly
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
