import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const { needsOnboarding, loading } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show during onboarding
    if (loading || needsOnboarding) return;
    
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    // Check if permanently dismissed
    const permanentlyDismissed = localStorage.getItem("pwa-prompt-dismissed-permanently");
    if (permanentlyDismissed === "true") return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS-specific prompt after a delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/other browsers
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [loading, needsOnboarding]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  const handleDismissPermanently = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed-permanently", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <Download className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Install App</h3>
              {isIOS ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Tap <span className="inline-flex items-center px-1 py-0.5 bg-muted rounded text-xs font-medium">Share</span> then <span className="inline-flex items-center px-1 py-0.5 bg-muted rounded text-xs font-medium">Add to Home Screen</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Add to your home screen for quick access
                </p>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!isIOS && deferredPrompt && (
            <Button onClick={handleInstall} className="w-full mt-3" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </Button>
          )}
          <button
            onClick={handleDismissPermanently}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Don't show again
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
