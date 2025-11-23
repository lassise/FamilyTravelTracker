import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface Country {
  name: string;
  flag: string;
  continent: string;
  visitedBy: string[];
}

const countries: Country[] = [
  { name: "Japan", flag: "🇯🇵", continent: "Asia", visitedBy: ["Mom", "Dad", "Alex", "Sophie"] },
  { name: "France", flag: "🇫🇷", continent: "Europe", visitedBy: ["Mom", "Dad", "Sophie"] },
  { name: "Thailand", flag: "🇹🇭", continent: "Asia", visitedBy: ["Mom", "Dad", "Alex"] },
  { name: "Italy", flag: "🇮🇹", continent: "Europe", visitedBy: ["Mom", "Dad", "Alex", "Sophie"] },
  { name: "Australia", flag: "🇦🇺", continent: "Oceania", visitedBy: ["Mom", "Dad"] },
  { name: "Spain", flag: "🇪🇸", continent: "Europe", visitedBy: ["Mom", "Sophie"] },
  { name: "USA", flag: "🇺🇸", continent: "North America", visitedBy: ["Mom", "Dad", "Alex", "Sophie"] },
  { name: "Canada", flag: "🇨🇦", continent: "North America", visitedBy: ["Dad", "Alex"] },
];

const CountryTracker = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Countries We've Explored
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our family's travel journey across the world
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {countries.map((country) => (
            <Card 
              key={country.name}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-3xl">{country.flag}</span>
                    <span>{country.name}</span>
                  </CardTitle>
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline" className="text-xs">
                  {country.continent}
                </Badge>
                <div className="flex flex-wrap gap-1">
                  {country.visitedBy.map((member) => (
                    <Badge 
                      key={member}
                      variant="secondary"
                      className="text-xs"
                    >
                      {member}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CountryTracker;
