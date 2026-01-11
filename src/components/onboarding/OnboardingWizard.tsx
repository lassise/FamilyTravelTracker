import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Globe, ArrowRight, ArrowLeft, Check, Plane, Home, Sparkles, Heart } from "lucide-react";
import FamilyMembersStep from "./FamilyMembersStep";
import CountriesStep from "./CountriesStep";
import HomeCountryStep from "./HomeCountryStep";
import WelcomeFeaturesStep from "./WelcomeFeaturesStep";
import TravelPreferencesStep from "./TravelPreferencesStep";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [homeCountry, setHomeCountry] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const steps = [
    {
      title: "Welcome to Family On The Fly!",
      description: "Your family's travel companion for tracking adventures around the world.",
      icon: Sparkles,
      component: <WelcomeFeaturesStep />,
    },
    {
      title: "Who's Traveling?",
      description: "Add the family members you'll be tracking travels for.",
      icon: Users,
      component: (
        <FamilyMembersStep 
          onMembersChange={setFamilyMembers}
        />
      ),
    },
    {
      title: "Where's Home?",
      description: "Select your home country. It will be displayed on the map but won't count as visited.",
      icon: Home,
      component: (
        <HomeCountryStep 
          onHomeCountryChange={setHomeCountry}
        />
      ),
    },
    {
      title: "Travel Preferences",
      description: "Help us personalize your experience with a few quick questions.",
      icon: Heart,
      component: <TravelPreferencesStep />,
    },
    {
      title: "Countries You've Visited",
      description: "Add countries your family has already explored. You can add details later.",
      icon: Globe,
      component: (
        <CountriesStep 
          familyMembers={familyMembers}
        />
      ),
    },
  ];

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      // Mark onboarding as complete in the database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }
      
      // Also set localStorage as fallback
      localStorage.setItem("onboarding_complete", "true");
      
      // Refresh the profile in context so needsOnboarding updates
      await refreshProfile();
      
      // Navigate to the app
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      onComplete();
    } finally {
      setCompleting(false);
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-hero mb-3">
            <Plane className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Family On The Fly
          </h1>
        </div>

        <Card className="shadow-travel">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <currentStep.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentStep.title}</CardTitle>
                <CardDescription>{currentStep.description}</CardDescription>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Step {step + 1} of {steps.length}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="min-h-[350px]">
              {currentStep.component}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                {step > 0 && (
                  <Button variant="ghost" onClick={handleBack} disabled={completing}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip} disabled={completing}>
                  Skip for now
                </Button>
                <Button onClick={handleNext} disabled={completing}>
                  {step === steps.length - 1 ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {completing ? "Saving..." : "Get Started"}
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWizard;
