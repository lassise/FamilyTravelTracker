import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountryFlag from "@/components/common/CountryFlag";
import { getRegionCode } from "@/lib/countriesData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Heart, Plus, X, ChevronDown, Star } from "lucide-react";
import type { Country } from "@/hooks/useFamilyData";

interface CountryWishlistProps {
  countries: Country[];
  wishlist: string[];
  onUpdate: () => void;
}

const CountryWishlist = ({ countries, wishlist, onUpdate }: CountryWishlistProps) => {
  const [isAdding, setIsAdding] = useState(false);

  // Get countries that are in the wishlist
  const wishlistCountries = countries.filter(c => wishlist.includes(c.id));
  
  // Get countries that can be added (not visited and not already in wishlist)
  const availableCountries = countries
    .filter(c => c.visitedBy.length === 0 && !wishlist.includes(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group available countries by continent
  const continentGroups = availableCountries.reduce((acc, country) => {
    if (!acc[country.continent]) {
      acc[country.continent] = [];
    }
    acc[country.continent].push(country);
    return acc;
  }, {} as Record<string, Country[]>);

  const handleAddToWishlist = async (countryId: string) => {
    try {
      setIsAdding(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setIsAdding(false);
        return;
      }
      const { error } = await supabase
        .from("country_wishlist")
        .insert({ country_id: countryId, user_id: user.id });

      if (error) throw error;

      toast({
        title: "Added to wishlist!",
        description: "Country added to your travel wishlist.",
      });
      onUpdate();
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: "Error",
        description: "Failed to add country to wishlist.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromWishlist = async (countryId: string) => {
    try {
      const { error } = await supabase
        .from("country_wishlist")
        .delete()
        .eq("country_id", countryId);

      if (error) throw error;

      toast({
        title: "Removed from wishlist",
        description: "Country removed from your travel wishlist.",
      });
      onUpdate();
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast({
        title: "Error",
        description: "Failed to remove country from wishlist.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Travel Wishlist
          {wishlistCountries.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {wishlistCountries.length}
            </Badge>
          )}
        </CardTitle>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isAdding || availableCountries.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Add Country
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-popover border-border" align="end">
            <ScrollArea className="h-80">
              {Object.entries(continentGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([continent, continentCountries]) => (
                  <div key={continent}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                      {continent} ({continentCountries.length})
                    </DropdownMenuLabel>
                    {continentCountries.map((country) => {
                      const regionCode = getRegionCode(country.name);
                      const storedFlag = (country.flag || '').trim().toUpperCase();
                      const storedFlagIsCode = /^[A-Z]{2}(-[A-Z]{3})?$/.test(storedFlag);
                      const effectiveCode = (regionCode || (storedFlagIsCode ? storedFlag : '')).toUpperCase();
                      const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(effectiveCode);

                      return (
                        <DropdownMenuItem
                          key={country.id}
                          onClick={() => handleAddToWishlist(country.id)}
                          className="cursor-pointer"
                        >
                          <span className="mr-2 inline-flex items-center">
                            {isSubdivision ? (
                              <CountryFlag countryCode={effectiveCode} countryName={country.name} size="sm" />
                            ) : (
                              <span>{country.flag}</span>
                            )}
                          </span>
                          {country.name}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              {availableCountries.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No more countries to add!
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent>
        {wishlistCountries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Your wishlist is empty</p>
            <p className="text-sm mt-1">Add countries you dream of visiting!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {wishlistCountries
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((country) => {
                const regionCode = getRegionCode(country.name);
                const storedFlag = (country.flag || '').trim().toUpperCase();
                const storedFlagIsCode = /^[A-Z]{2}(-[A-Z]{3})?$/.test(storedFlag);
                const effectiveCode = (regionCode || (storedFlagIsCode ? storedFlag : '')).toUpperCase();
                const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(effectiveCode);

                return (
                  <div
                    key={country.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50 group hover:border-primary/50 transition-colors"
                  >
                    <span className="text-xl inline-flex items-center">
                      {isSubdivision ? (
                        <CountryFlag countryCode={effectiveCode} countryName={country.name} size="md" />
                      ) : (
                        <span>{country.flag}</span>
                      )}
                    </span>
                    <span className="text-sm truncate flex-1">{country.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFromWishlist(country.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CountryWishlist;
