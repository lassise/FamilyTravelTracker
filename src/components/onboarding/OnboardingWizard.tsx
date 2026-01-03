import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Globe, ArrowRight, ArrowLeft, Check, Plane } from "lucide-react";
import FamilyMembersStep from "./FamilyMembersStep";
import CountriesStep from "./CountriesStep";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(0);
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);

  const steps = [
    {
      title: "Welcome to Family On The Fly!",
      description: "Let's set up your travel tracker. First, add the people you travel with.",
      icon: Users,
      component: (
        <FamilyMembersStep 
          onMembersChange={setFamilyMembers}
        />
      ),
    },
    {
      title: "Countries You've Visited",
      description: "Add the countries your family has already visited. You can add details later.",
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

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
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
            <div className="min-h-[300px]">
              {currentStep.component}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                {step > 0 && (
                  <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip}>
                  Skip for now
                </Button>
                <Button onClick={handleNext}>
                  {step === steps.length - 1 ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Get Started
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
