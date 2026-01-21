import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFamilyData } from "@/hooks/useFamilyData";
import { Loader2, User, Globe, Users } from "lucide-react";
import TravelPreferencesSection from "@/components/profile/TravelPreferencesSection";
import TravelRecommendations from "@/components/travel/TravelRecommendations";
import QuickAIPlanner from "@/components/travel/QuickAIPlanner";
import FamilyMember from "@/components/FamilyMember";
import FamilyMemberDialog from "@/components/FamilyMemberDialog";
import DistanceUnitSetting from "@/components/settings/DistanceUnitSetting";
import TravelShareSettings from "@/components/sharing/TravelShareSettings";

const Profile = () => {
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const { countries, familyMembers, totalContinents, refetch } = useFamilyData();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0).length;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName });
    
    if (error) {
      toast({ title: "Error saving profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
    setSaving(false);
  };

  if (authLoading) {
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Family Members Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Family Members
                </CardTitle>
                <CardDescription>Track each family member's travel adventures</CardDescription>
              </div>
              <FamilyMemberDialog onSuccess={refetch} />
            </div>
          </CardHeader>
          <CardContent>
            {familyMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No family members added yet. Add your first traveler!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {familyMembers.map((member) => (
                  <FamilyMember 
                    key={member.id} 
                    {...member} 
                    countries={countries}
                    onUpdate={refetch} 
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Profile Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Manage your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
                
                <div className="border-t pt-4 mt-4">
                  <DistanceUnitSetting />
                </div>
              </CardContent>
            </Card>

            {/* Travel Stats Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Travel Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{visitedCountries}</p>
                    <p className="text-sm text-muted-foreground">Countries Visited</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{totalContinents}</p>
                    <p className="text-sm text-muted-foreground">Continents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Travel Preferences */}
            <TravelPreferencesSection />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* AI Recommendations */}
            <TravelRecommendations />

            {/* Quick AI Planner */}
            <QuickAIPlanner />

            {/* Share Profile Card */}
            <TravelShareSettings />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
