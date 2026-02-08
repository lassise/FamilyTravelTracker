import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Clock } from "lucide-react";

const NewTrip = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-hero mb-4 animate-pulse">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              AI Travel Planner
              <span className="block text-primary text-2xl md:text-3xl mt-2 font-semibold">Coming Soon</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We're polishing our AI engines to give you the most personalized,
              stress-free family travel planning experience ever.
            </p>
            <div className="pt-2">
              <Button
                variant="link"
                className="text-primary hover:text-primary/80 underline text-sm"
                onClick={() => navigate("/simple-planner")}
              >
                Try our generic Beta Planner (Simple Version)
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto bg-gradient-hero border-0 hover:opacity-90 transition-opacity"
            >
              Explore Dashboard
            </Button>
          </div>

          <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-muted/50 border border-border/50">
              <Clock className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Smarter Routing</h3>
              <p className="text-sm text-muted-foreground">Optimized paths tailored for traveling with little ones.</p>
            </div>
            <div className="p-6 rounded-2xl bg-muted/50 border border-border/50">
              <Sparkles className="h-6 w-6 text-secondary mb-3" />
              <h3 className="font-semibold mb-2">Family Needs</h3>
              <p className="text-sm text-muted-foreground">Automatic filtering for strollers, car seats, and nap schedules.</p>
            </div>
            <div className="p-6 rounded-2xl bg-muted/50 border border-border/50">
              <Sparkles className="h-6 w-6 text-accent mb-3" />
              <h3 className="font-semibold mb-2">Real Booking</h3>
              <p className="text-sm text-muted-foreground">Direct integration with flights and accommodations.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NewTrip;

