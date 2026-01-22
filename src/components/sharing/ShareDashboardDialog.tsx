import { useState, useEffect, useMemo } from "react";
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

interface ShareLink {
  id: string;
  owner_user_id: string;
  token: string;
  is_active: boolean;
  include_stats: boolean;
  include_countries: boolean;
  include_memories: boolean;
}

const shareOptions = [
  {
    key: "include_stats",
    label: "Stats",
    description: "Home country + counts + since",
    icon: Globe,
  },
  {
    key: "include_countries",
    label: "Map & countries",
    description: "Visited countries + map",
    icon: MapPin,
  },
  {
    key: "include_memories",
    label: "Memories",
    description: "Shareable photos",
    icon: Camera,
  },
] as const;

export const ShareDashboardDialog = ({ open, onOpenChange }: ShareDashboardDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchOrCreateShareLink();
    }
  }, [open, user]);

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const fetchOrCreateShareLink = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: existing, error: fetchError } = await supabase
        .from("share_links")
        .select("id, owner_user_id, token, is_active, include_stats, include_countries, include_memories")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching share link:", fetchError);
        toast.error("Failed to load sharing settings");
        return;
      }

      if (existing) {
        setShareLink(existing as ShareLink);
        return;
      }

      const newToken = generateToken();
      const { data: created, error: createError } = await supabase
        .from("share_links")
        .insert({
          owner_user_id: user.id,
          token: newToken,
          is_active: true,
          include_stats: true,
          include_countries: true,
          include_memories: true,
        })
        .select("id, owner_user_id, token, is_active, include_stats, include_countries, include_memories")
        .single();

      if (createError) {
        console.error("Error creating share link:", createError);
        toast.error("Failed to create share link");
        return;
      }

      setShareLink(created as ShareLink);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (!shareLink?.token) return "";
    return `${window.location.origin}/share/${shareLink.token}`;
  }, [shareLink]);

  const handleToggle = async (key: keyof ShareLink, value: boolean) => {
    if (!shareLink) return;
    setSaving(true);
    const previous = shareLink;
    setShareLink({ ...shareLink, [key]: value } as ShareLink);

    const { data, error } = await supabase
      .from("share_links")
      .update({ [key]: value })
      .eq("id", shareLink.id)
      .select("id, owner_user_id, token, is_active, include_stats, include_countries, include_memories")
      .single();

    if (error || !data) {
      setShareLink(previous);
      toast.error("Failed to update setting");
    }
    setSaving(false);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    if (!shareLink?.is_active) {
      toast.error("This link is disabled. Turn it back on to share.");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Family Travel Dashboard",
          text: "Check out our family's travel adventures!",
          url: shareUrl,
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
    if (shareUrl) {
      window.open(shareUrl, "_blank");
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
        ) : shareLink ? (
          <div className="space-y-4">
            {/* Share Link */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
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
                    <Check className="h-4 w-4 text-primary" />
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

            {/* Disable link */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Link active</Label>
                <p className="text-xs text-muted-foreground">Turn off to disable the shared page.</p>
              </div>
              <Switch
                checked={shareLink.is_active}
                onCheckedChange={(v) => handleToggle("is_active", v)}
                disabled={saving}
              />
            </div>

            <Separator />

            {/* Share Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">What to share</Label>
              {shareOptions.map((option) => {
                const Icon = option.icon;
                const isEnabled = shareLink[option.key as keyof ShareLink] as boolean;
                
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
                      onCheckedChange={(v) => handleToggle(option.key as keyof ShareLink, v)}
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Share Button */}
            <Button onClick={handleShare} className="w-full" disabled={!shareLink.is_active}>
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
