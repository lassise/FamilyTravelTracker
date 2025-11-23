import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MapPin } from "lucide-react";

interface Recommendation {
  country: string;
  flag: string;
  place: string;
  description: string;
  recommendedBy: string;
  rating: number;
}

const recommendations: Recommendation[] = [
  {
    country: "Japan",
    flag: "🇯🇵",
    place: "Fushimi Inari Shrine",
    description: "Thousands of vibrant red torii gates creating magical pathways up the mountain.",
    recommendedBy: "Sophie",
    rating: 5
  },
  {
    country: "Italy",
    flag: "🇮🇹",
    place: "Amalfi Coast",
    description: "Breathtaking coastal views with colorful cliffside villages and crystal-clear waters.",
    recommendedBy: "Mom",
    rating: 5
  },
  {
    country: "Thailand",
    flag: "🇹🇭",
    place: "Phi Phi Islands",
    description: "Paradise beaches with stunning limestone cliffs and incredible snorkeling.",
    recommendedBy: "Alex",
    rating: 5
  },
  {
    country: "France",
    flag: "🇫🇷",
    place: "Mont Saint-Michel",
    description: "Medieval island abbey with stunning architecture and dramatic tides.",
    recommendedBy: "Dad",
    rating: 5
  },
];

const Recommendations = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Our Top Recommendations
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Must-visit places we absolutely loved
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {recommendations.map((rec, index) => (
            <Card 
              key={index}
              className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/40 overflow-hidden"
            >
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{rec.flag}</span>
                    <div>
                      <CardTitle className="text-xl">{rec.place}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{rec.country}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: rec.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-muted-foreground mb-3">{rec.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Recommended by</span>
                  <span className="font-semibold text-primary">{rec.recommendedBy}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Recommendations;
