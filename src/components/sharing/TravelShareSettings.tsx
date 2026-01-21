import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Share2, 
  Copy, 
  ExternalLink, 
  Globe, 
  Camera, 
  MapPin, 
  Flag,
  Building2,
  Trophy,
  Flame,
  Calendar,
  Users,
  Dna,
  Grid3X3,
  Loader2,
  Lock,
  Eye,
  Download
} from "lucide-react";

interface ShareProfile {
  id: string;
  share_token: string;
  is_public: boolean;
  show_photos: boolean;
  show_stats: boolean;
  show_map: boolean;
  show_wishlist: boolean;
  show_countries: boolean;
  show_cities: boolean;
  show_achievements: boolean;
  show_streaks: boolean;
  show_timeline: boolean;
  show_family_members: boolean;
  show_travel_dna: boolean;
  show_heatmap: boolean;
  theme_color: string;
  allow_downloads: boolean;
  custom_headline: string | null;
}

const defaultShareProfile: Partial<ShareProfile> = {
  is_public: false,
  show_photos: true,
  show_stats: true,
  show_map: true,
  show_wishlist: false,
  show_countries: true,
  show_cities: true,
  show_achievements: true,
  show_streaks: false,
  show_timeline: true,
  show_family_members: false,
  show_travel_dna: false,
  show_heatmap: false,
  theme_color: 'default',
  allow_downloads: false,
};

const permissionGroups = [
  {
    title: "Core Content",
    description: "Basic travel information",
    items: [
      { key: "show_map", label: "Interactive Map", icon: MapPin, description: "Visual map of visited countries" },
      { key: "show_stats", label: "Travel Statistics", icon: Globe, description: "Countries, continents, world coverage" },
      { key: "show_countries", label: "Countries List", icon: Flag, description: "Full list of visited countries" },
      { key: "show_cities", label: "Cities Visited", icon: Building2, description: "Cities within each country" },
    ]
  },
  {
    title: "Achievements & Progress",
    description: "Travel milestones and tracking",
    items: [
      { key: "show_achievements", label: "Achievements", icon: Trophy, description: "Unlocked travel achievements" },
      { key: "show_streaks", label: "Travel Streaks", icon: Flame, description: "Consecutive travel records" },
      { key: "show_timeline", label: "Travel Timeline", icon: Calendar, description: "Chronological travel history" },
    ]
  },
  {
    title: "Advanced Analytics",
    description: "In-depth travel insights",
    items: [
      { key: "show_travel_dna", label: "Travel DNA", icon: Dna, description: "Your unique traveler profile" },
      { key: "show_heatmap", label: "Activity Heatmap", icon: Grid3X3, description: "When you travel most" },
    ]
  },
  {
    title: "Personal Content",
    description: "Photos and family data",
    items: [
      { key: "show_photos", label: "Photo Gallery", icon: Camera, description: "Travel photos and memories" },
      { key: "show_family_members", label: "Family Members", icon: Users, description: "Individual member stats" },
    ]
  },
];

export const TravelShareSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shareProfile, setShareProfile] = useState<ShareProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customHeadline, setCustomHeadline] = useState("");

  useEffect(() => {
    if (user) fetchShareProfile();
  }, [user]);

  const fetchShareProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("share_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setShareProfile(data as ShareProfile);
      setCustomHeadline(data.custom_headline || "");
    }
    setLoading(false);
  };

  const handleCreateShareProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { data, error } = await supabase
      .from("share_profiles")
      .insert({ 
        user_id: user.id, 
        ...defaultShareProfile 
      })
      .select()
      .single();
    
    if (error) {
      toast({ title: "Error creating share profile", variant: "destructive" });
    } else {
      setShareProfile(data as ShareProfile);
      toast({ title: "Share profile created!" });
    }
    setSaving(false);
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!shareProfile) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("share_profiles")
      .update({ is_public: isPublic })
      .eq("id", shareProfile.id);
    
    if (!error) {
      setShareProfile({ ...shareProfile, is_public: isPublic });
      toast({ title: isPublic ? "Profile is now public!" : "Profile is now private" });
    }
    setSaving(false);
  };

  const handleToggleSetting = async (field: keyof ShareProfile, value: boolean) => {
    if (!shareProfile) return;
    
    const { error } = await supabase
      .from("share_profiles")
      .update({ [field]: value })
      .eq("id", shareProfile.id);
    
    if (!error) {
      setShareProfile({ ...shareProfile, [field]: value });
    }
  };

  const handleSaveHeadline = async () => {
    if (!shareProfile) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("share_profiles")
      .update({ custom_headline: customHeadline || null })
      .eq("id", shareProfile.id);
    
    if (!error) {
      setShareProfile({ ...shareProfile, custom_headline: customHeadline || null });
      toast({ title: "Headline saved!" });
    }
    setSaving(false);
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

  const enabledCount = shareProfile 
    ? Object.entries(shareProfile)
        .filter(([key, value]) => key.startsWith('show_') && value === true)
        .length
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!shareProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Your Travels
          </CardTitle>
          <CardDescription>
            Create a beautiful, shareable highlights page to show off your adventures with friends and family
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateShareProfile} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
            Create Shareable Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Your Travels
            </CardTitle>
            <CardDescription>
              Control exactly what others can see on your highlights page
            </CardDescription>
          </div>
          <Badge variant={shareProfile.is_public ? "default" : "secondary"}>
            {shareProfile.is_public ? (
              <><Eye className="h-3 w-3 mr-1" /> Public</>
            ) : (
              <><Lock className="h-3 w-3 mr-1" /> Private</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Public Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Make Profile Public</Label>
            <p className="text-sm text-muted-foreground">
              Allow anyone with the link to view your travel highlights
            </p>
          </div>
          <Switch
            checked={shareProfile.is_public}
            onCheckedChange={handleTogglePublic}
            disabled={saving}
          />
        </div>

        {shareProfile.is_public && (
          <>
            {/* Share Link */}
            <div className="space-y-2">
              <Label>Your Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/highlights/${shareProfile.share_token}`}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button size="icon" variant="outline" onClick={copyShareLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={openShareLink}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Custom Headline */}
            <div className="space-y-2">
              <Label htmlFor="headline">Custom Headline</Label>
              <div className="flex gap-2">
                <Input
                  id="headline"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  placeholder="Explorer, Adventurer, Travel Enthusiast..."
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleSaveHeadline}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Permissions Summary */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium">What to share</h3>
              <Badge variant="outline">{enabledCount} items enabled</Badge>
            </div>

            {/* Permission Groups */}
            {permissionGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">{group.title}</h4>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-2">
                  {group.items.map((item) => (
                    <div 
                      key={item.key} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={shareProfile[item.key as keyof ShareProfile] as boolean}
                        onCheckedChange={(v) => handleToggleSetting(item.key as keyof ShareProfile, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Separator />

            {/* Download Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Allow Downloads</p>
                  <p className="text-xs text-muted-foreground">Let viewers download your travel data</p>
                </div>
              </div>
              <Switch
                checked={shareProfile.allow_downloads}
                onCheckedChange={(v) => handleToggleSetting('allow_downloads', v)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TravelShareSettings;
