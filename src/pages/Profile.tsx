import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFamilyData } from "@/hooks/useFamilyData";
import { Loader2, User, Share2, Copy, ExternalLink, Globe, Camera, MapPin, Sparkles, Zap } from "lucide-react";
import TravelPreferencesSection from "@/components/profile/TravelPreferencesSection";
import TravelRecommendations from "@/components/travel/TravelRecommendations";
import QuickAIPlanner from "@/components/travel/QuickAIPlanner";

const Profile = () => {
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const { countries, totalContinents } = useFamilyData();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareProfile, setShareProfile] = useState<{
    id: string;
    share_token: string;
    is_public: boolean;
    show_photos: boolean;
    show_stats: boolean;
    show_map: boolean;
    show_wishlist: boolean;
    custom_headline: string | null;
  } | null>(null);
  const [loadingShare, setLoadingShare] = useState(true);

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

  useEffect(() => {
    const fetchShareProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("share_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setShareProfile(data);
      }
      setLoadingShare(false);
    };

    fetchShareProfile();
  }, [user]);

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

  const handleCreateShareProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("share_profiles")
      .insert({ user_id: user.id, is_public: false })
      .select()
      .single();
    
    if (error) {
      toast({ title: "Error creating share profile", variant: "destructive" });
    } else {
      setShareProfile(data);
      toast({ title: "Share profile created!" });
    }
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!shareProfile) return;
    
    const { error } = await supabase
      .from("share_profiles")
      .update({ is_public: isPublic })
      .eq("id", shareProfile.id);
    
    if (!error) {
      setShareProfile({ ...shareProfile, is_public: isPublic });
      toast({ title: isPublic ? "Profile is now public!" : "Profile is now private" });
    }
  };

  const handleToggleSetting = async (field: string, value: boolean) => {
    if (!shareProfile) return;
    
    const { error } = await supabase
      .from("share_profiles")
      .update({ [field]: value })
      .eq("id", shareProfile.id);
    
    if (!error) {
      setShareProfile({ ...shareProfile, [field]: value });
    }
  };

  const copyShareLink = () => {
    if (!shareProfile) return;
    const link = `${window.location.origin}/highlights/${shareProfile.share_token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard!" });
  };

  const openShareLink = () => {
    if (!shareProfile) return;
    window.open(`/highlights/${shareProfile.share_token}`, "_blank");
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        </div>

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Share Your Travels
                </CardTitle>
                <CardDescription>
                  Create a shareable highlights page to show off your adventures
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingShare ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !shareProfile ? (
                  <Button onClick={handleCreateShareProfile} className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Create Shareable Profile
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Make Profile Public</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow others to view your highlights page
                        </p>
                      </div>
                      <Switch
                        checked={shareProfile.is_public}
                        onCheckedChange={handleTogglePublic}
                      />
                    </div>

                    {shareProfile.is_public && (
                      <>
                        <div className="border-t pt-4 space-y-3">
                          <Label className="text-sm font-medium">What to show:</Label>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Interactive Map</span>
                            </div>
                            <Switch
                              checked={shareProfile.show_map}
                              onCheckedChange={(v) => handleToggleSetting("show_map", v)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Travel Statistics</span>
                            </div>
                            <Switch
                              checked={shareProfile.show_stats}
                              onCheckedChange={(v) => handleToggleSetting("show_stats", v)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Photo Gallery</span>
                            </div>
                            <Switch
                              checked={shareProfile.show_photos}
                              onCheckedChange={(v) => handleToggleSetting("show_photos", v)}
                            />
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <Label>Your Share Link</Label>
                          <div className="flex gap-2">
                            <Input
                              value={`${window.location.origin}/highlights/${shareProfile.share_token}`}
                              readOnly
                              className="text-xs"
                            />
                            <Button size="icon" variant="outline" onClick={copyShareLink}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={openShareLink}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
