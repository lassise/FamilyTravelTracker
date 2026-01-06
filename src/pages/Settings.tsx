import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings as SettingsIcon, Globe, Search, Check } from "lucide-react";
import { countries as countriesList } from "countries-list";

interface Country {
  code: string;
  name: string;
  flag: string;
}

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [homeCountry, setHomeCountry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Build country list
  const countries: Country[] = Object.entries(countriesList).map(([code, data]) => ({
    code,
    name: data.name,
    flag: String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
  })).sort((a, b) => a.name.localeCompare(b.name));

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("home_country")
        .eq("id", user.id)
        .single();
      
      if (data?.home_country) {
        setHomeCountry(data.home_country);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const handleSelectCountry = async (countryName: string) => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ home_country: countryName })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } else {
      setHomeCountry(countryName);
      toast({ title: "Home country updated!" });
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Home Country
            </CardTitle>
            <CardDescription>
              Set your home country to personalize your travel map and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {homeCountry && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Currently set to: <strong>{homeCountry}</strong></span>
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredCountries.map((country) => (
                  <Button
                    key={country.code}
                    variant={homeCountry === country.name ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => handleSelectCountry(country.name)}
                    disabled={saving}
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                    {homeCountry === country.name && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
