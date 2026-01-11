import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

const Onboarding = () => {
  const { user, loading, profile, needsOnboarding } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && user && profile !== null && !needsOnboarding) {
      // Already completed onboarding, redirect to main app
      navigate("/");
    }
  }, [user, loading, profile, needsOnboarding, navigate]);

  const handleComplete = () => {
    // Navigate to dashboard after onboarding
    navigate("/");
  };

  if (loading || profile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user doesn't need onboarding, show loading while redirecting
  if (!needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <OnboardingWizard onComplete={handleComplete} />;
};

export default Onboarding;
