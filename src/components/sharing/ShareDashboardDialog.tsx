import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Share2, 
  Copy, 
  ExternalLink, 
  Globe, 
  MapPin, 
  Flag,
  Camera,
  Loader2,
  Check
} from "lucide-react";

interface ShareDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareProfile {
  id: string;
  dashboard_share_token: string | null;
  is_public: boolean;
  show_stats: boolean;
  show_map: boolean;
  show_countries: boolean;
  show_photos: boolean;
}

const shareOptions = [
  { 
    key: "show_stats", 
    label: "Hero Banner", 
    description: "Stats summary & travel progress",
    icon: Globe 
  },
  { 
    key: "show_map", 
    label: "World Map", 
    description: "Interactive map of visited countries",
    icon: MapPin 
  },
  { 
    key: "show_countries", 
    label: "Countries List", 
    description: "List of all visited countries",
    icon: Flag 
  },
  { 
    key: "show_photos", 
    label: "Memories", 
    description: "Photos and timeline",
    icon: Camera 
  },
];

export const ShareDashboardDialog = ({ open, onOpenChange }: ShareDashboardDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareProfile, setShareProfile] = useState<ShareProfile | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<ShareProfile>>({});

  useEffect(() => {
    if (open && user) {
      fetchOrCreateShareProfile();
    }
  }, [open, user]);

  const fetchOrCreateShareProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch existing share profile
      let { data: profile, error } = await supabase
        .from("share_profiles")
        .select("id, dashboard_share_token, is_public, show_stats, show_map, show_countries, show_photos")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching share profile:", error);
        toast.error("Failed to load sharing settings");
        setLoading(false);
        return;
      }

      // Create if doesn't exist with defaults (ALL 4 options enabled by default, public)
      if (!profile) {
        const newToken = generateToken();
        const { data: newProfile, error: createError } = await supabase
          .from("share_profiles")
          .insert({
            user_id: user.id,
            is_public: true,
            show_stats: true,      // Hero Banner - ON by default
            show_map: true,        // World Map - ON by default
            show_countries: true,  // Countries List - ON by default
            show_photos: true,     // Memories (Photos/Timeline) - ON by default
            show_cities: true,
            show_achievements: true,
            show_timeline: true,   // Timeline - ON by default
            show_family_members: true,
            dashboard_share_token: newToken,
          })
          .select("id, dashboard_share_token, is_public, show_stats, show_map, show_countries, show_photos")
          .single();

        if (createError) {
          console.error("Error creating share profile:", createError);
          toast.error("Failed to create sharing settings");
          setLoading(false);
          return;
        }
        profile = newProfile;
      }

      // Generate dashboard token if missing
      if (!profile.dashboard_share_token) {
        const newToken = generateToken();
        const { data: updatedProfile, error: updateError } = await supabase
          .from("share_profiles")
          .update({ 
            dashboard_share_token: newToken,
            is_public: true 
          })
          .eq("id", profile.id)
          .select("id, dashboard_share_token, is_public, show_stats, show_map, show_countries, show_photos")
          .single();

        if (!updateError && updatedProfile) {
          profile = updatedProfile;
        }
      }

      // Ensure it's public
      if (!profile.is_public) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from("share_profiles")
          .update({ is_public: true })
          .eq("id", profile.id)
          .select("id, dashboard_share_token, is_public, show_stats, show_map, show_countries, show_photos")
          .single();

        if (!updateError && updatedProfile) {
          profile = updatedProfile;
        }
      }

      setShareProfile(profile as ShareProfile);
      setPendingChanges({});
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleToggle = async (key: keyof ShareProfile, value: boolean) => {
    if (!shareProfile) return;

    // Optimistically update UI
    setShareProfile(prev => prev ? { ...prev, [key]: value } : null);

    // Save to database
    const { error } = await supabase
      .from("share_profiles")
      .update({ [key]: value })
      .eq("id", shareProfile.id);

    if (error) {
      // Revert on error
      setShareProfile(prev => prev ? { ...prev, [key]: !value } : null);
      toast.error("Failed to update setting");
    }
  };

  const getShareUrl = () => {
    if (!shareProfile?.dashboard_share_token) return "";
    return `${window.location.origin}/dashboard/${shareProfile.dashboard_share_token}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    const url = getShareUrl();
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Family Travel Dashboard",
          text: "Check out our family's travel adventures!",
          url: url,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleOpenPreview = () => {
    const url = getShareUrl();
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Choose what to share with friends and family
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : shareProfile ? (
          <div className="space-y-4">
            {/* Share Link */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={getShareUrl()}
                  readOnly
                  className="text-xs font-mono bg-muted"
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={handleOpenPreview}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Share Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">What to share</Label>
              {shareOptions.map((option) => {
                const Icon = option.icon;
                const isEnabled = shareProfile[option.key as keyof ShareProfile] as boolean;
                
                return (
                  <div 
                    key={option.key}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(v) => handleToggle(option.key as keyof ShareProfile, v)}
                    />
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Share Button */}
            <Button onClick={handleShare} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Share Dashboard
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Failed to load sharing settings. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDashboardDialog;
