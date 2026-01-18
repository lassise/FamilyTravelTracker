import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, MessageSquare } from "lucide-react";

interface ContextStepProps {
  extraContext: string;
  onChange: (value: string) => void;
}

const EXAMPLE_PROMPTS = [
  "We have a 3 year old who still naps in the afternoon.",
  "We need stroller-friendly and minimal walking options.",
  "We want luxury experiences but nothing too touristy.",
  "We hate early morning flights and activities.",
  "My spouse uses a wheelchair, so accessibility is important.",
  "We're vegetarian and prefer organic food options.",
  "We're celebrating our anniversary, so romantic spots would be great.",
];

export function ContextStep({ extraContext, onChange }: ContextStepProps) {
  const insertExample = (example: string) => {
    const newValue = extraContext 
      ? `${extraContext}\n${example}` 
      : example;
    onChange(newValue);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="extraContext" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Extra Context (Optional)
        </Label>
        <Textarea
          id="extraContext"
          value={extraContext}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tell us anything important about your trip in plain English. For example: special needs, dietary restrictions, mobility concerns, travel style preferences..."
          className="min-h-[120px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This helps our AI create a more personalized itinerary for you.
        </p>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Click any example below to add it to your context:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => insertExample(example)}
                className="text-xs px-2 py-1 rounded-md bg-background border hover:bg-accent transition-colors text-left"
              >
                {example}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
