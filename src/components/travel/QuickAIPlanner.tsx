import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Crown } from "lucide-react";

const QuickAIPlanner = () => {
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <div className="absolute top-0 right-0 p-4">
        <Crown className="h-5 w-5 text-amber-500" />
      </div>

      {/* Background Decorative Sparkle */}
      <Sparkles className="absolute -bottom-8 -left-8 h-32 w-32 text-primary/5 rotate-12" />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          Quick AI Planner
        </CardTitle>
        <CardDescription>
          Next-generation personalized itineraries
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-8">
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
            Coming Soon
          </div>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            We're building a smarter way to plan your family's adventures. Stay tuned!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickAIPlanner;

