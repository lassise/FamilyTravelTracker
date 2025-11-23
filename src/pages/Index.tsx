import Hero from "@/components/Hero";
import FamilyMember from "@/components/FamilyMember";
import CountryTracker from "@/components/CountryTracker";
import Recommendations from "@/components/Recommendations";
import FamilyMemberDialog from "@/components/FamilyMemberDialog";
import { useFamilyData } from "@/hooks/useFamilyData";

const Index = () => {
  const { familyMembers, countries, loading, refetch } = useFamilyData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading family adventures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Meet Our Family
          </h2>
          <p className="text-muted-foreground text-lg mb-4">
            Four adventurers exploring the world together
          </p>
          <FamilyMemberDialog onSuccess={refetch} />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {familyMembers.map((member) => (
            <FamilyMember key={member.id} {...member} onUpdate={refetch} />
          ))}
        </div>
      </section>

      <CountryTracker 
        countries={countries} 
        familyMembers={familyMembers}
        onUpdate={refetch}
      />
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
