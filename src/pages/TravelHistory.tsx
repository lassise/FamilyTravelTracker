import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import AppLayout from "@/components/layout/AppLayout";
import FamilyMember from "@/components/FamilyMember";
import CountryTracker from "@/components/CountryTracker";
import TravelStats from "@/components/TravelStats";
import ContinentFilter from "@/components/ContinentFilter";
import CountryWishlist from "@/components/CountryWishlist";
import FamilyMemberDialog from "@/components/FamilyMemberDialog";
import { Loader2 } from "lucide-react";

const TravelHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const { familyMembers, countries, wishlist, loading, refetch, totalContinents } = useFamilyData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading travel history...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Our Travel History
          </h1>
          <p className="text-muted-foreground text-lg">
            Track the countries your family has explored together
          </p>
        </div>

        <TravelStats 
          totalCountries={countries.length}
          totalContinents={totalContinents}
          familyMembers={familyMembers}
        />

        <ContinentFilter 
          countries={countries}
          familyMembers={familyMembers}
        />

        <CountryTracker 
          countries={countries} 
          familyMembers={familyMembers}
          onUpdate={refetch}
        />

        <section className="py-12">
          <CountryWishlist 
            countries={countries}
            wishlist={wishlist}
            onUpdate={refetch}
          />
        </section>
        
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Family Members
            </h2>
            <p className="text-muted-foreground mb-4">
              Track each family member's travel adventures
            </p>
            <FamilyMemberDialog onSuccess={refetch} />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {familyMembers.map((member) => (
              <FamilyMember 
                key={member.id} 
                {...member} 
                countries={countries}
                onUpdate={refetch} 
              />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default TravelHistory;
