import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Country } from "@/hooks/useFamilyData";
import { getCountryMetadataByName } from "@/lib/countryMetadata";
import { getAllCountries } from "@/lib/countriesData";
import { LucideIcon, Waves, Mountain, TreePine, Sparkles, Globe } from "lucide-react";

export type GeographicType = "islands" | "landlocked" | "coastal" | "g7" | "g20";

interface GeographicDetailsDialogProps {
  type: GeographicType;
  countries: Country[];
  children: React.ReactNode;
}

const typeConfig: Record<GeographicType, { 
  title: string; 
  description: string; 
  icon: LucideIcon; 
  color: string;
  filter: (metadata: ReturnType<typeof getCountryMetadataByName>) => boolean;
}> = {
  islands: {
    title: "Island Nations",
    description: "Countries that are islands or archipelagos",
    icon: Waves,
    color: "text-cyan-500",
    filter: (m) => m?.isIsland ?? false,
  },
  landlocked: {
    title: "Landlocked Countries",
    description: "Countries with no access to the ocean",
    icon: Mountain,
    color: "text-amber-500",
    filter: (m) => m?.isLandlocked ?? false,
  },
  coastal: {
    title: "Coastal Countries",
    description: "Countries with coastlines (not islands)",
    icon: TreePine,
    color: "text-blue-500",
    filter: (m) => m ? !m.isIsland && !m.isLandlocked : false,
  },
  g7: {
    title: "G7 Countries",
    description: "Group of Seven major advanced economies",
    icon: Sparkles,
    color: "text-purple-500",
    filter: (m) => m?.g7 ?? false,
  },
  g20: {
    title: "G20 Countries",
    description: "Group of Twenty major economies",
    icon: Globe,
    color: "text-blue-500",
    filter: (m) => m?.g20 ?? false,
  },
};

const GeographicDetailsDialog = ({ type, countries, children }: GeographicDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const config = typeConfig[type];
  const allCountriesData = getAllCountries();

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0);
  
  const filteredCountries = visitedCountries.filter(country => {
    const metadata = getCountryMetadataByName(country.name);
    return config.filter(metadata);
  });

  const getFlag = (countryName: string) => {
    const countryData = allCountriesData.find(c => c.name === countryName);
    return countryData?.flag || "🏳️";
  };

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
        
        {filteredCountries.length > 0 ? (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {filteredCountries.map((country) => {
                const metadata = getCountryMetadataByName(country.name);
                return (
                  <div 
                    key={country.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-2xl">{getFlag(country.name)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{country.name}</p>
                      {metadata && (
                        <p className="text-xs text-muted-foreground">
                          {metadata.region} • {metadata.capital}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {country.continent}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {config.title.toLowerCase()} visited yet
          </p>
        )}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} visited
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeographicDetailsDialog;
