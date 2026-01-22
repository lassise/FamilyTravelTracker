import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Globe, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import PublicPhotoGallery from "@/components/travel/PublicPhotoGallery";
import { useHomeCountry } from "@/hooks/useHomeCountry";

type SharedCountry = {
  id: string;
  name: string;
  flag: string;
  continent: string;
  visitedBy: string[];
};

type SharedPayload = {
  owner: {
    user_id: string;
    full_name: string | null;
    home_country: string | null;
  };
  share: {
    token: string;
    include_stats: boolean;
    include_countries: boolean;
    include_memories: boolean;
  };
  countries: Array<{ id: string; name: string; flag: string; continent: string }>;
  visited_country_ids: string[];
  visit_details: any[];
  state_visits: any[];
  photos: any[];
};

const SharedDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharedPayload | null>(null);

  const resolvedHome = useHomeCountry(payload?.owner.home_country || null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError("Invalid link");
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_shared_dashboard", { token });
      if (rpcError || !data) {
        setError("Link not available");
        setLoading(false);
        return;
      }

      setPayload(data as SharedPayload);
      setLoading(false);
    };

    run();
  }, [token]);

  const countries: SharedCountry[] = useMemo(() => {
    if (!payload) return [];
    const visited = new Set(payload.visited_country_ids || []);
    return (payload.countries || []).map((c) => ({
      ...c,
      visitedBy: visited.has(c.id) ? ["Visited"] : [],
    }));
  }, [payload]);

  const visitedCountriesCount = useMemo(
    () => countries.filter((c) => c.visitedBy.length > 0 && !resolvedHome.isHomeCountry(c.name)).length,
    [countries, resolvedHome]
  );

  const totalContinents = useMemo(() => {
    const continents = new Set(countries.filter((c) => c.visitedBy.length > 0).map((c) => c.continent));
    return continents.size;
  }, [countries]);

  const statesVisitedCount = useMemo(() => {
    if (!resolvedHome.iso2 || !resolvedHome.hasStateTracking) return 0;
    const uniqueStates = new Set(
      (payload?.state_visits || [])
        .filter((sv: any) => sv.country_code === resolvedHome.iso2)
        .map((sv: any) => sv.state_code)
    );
    return uniqueStates.size;
  }, [payload, resolvedHome]);

  const earliestYear = useMemo(() => {
    const items = (payload?.visit_details || []) as any[];
    const years: number[] = [];
    for (const v of items) {
      if (v?.visit_date) {
        const y = new Date(v.visit_date).getFullYear();
        if (!Number.isNaN(y)) years.push(y);
      } else if (typeof v?.approximate_year === "number") {
        years.push(v.approximate_year);
      }
    }
    return years.length ? Math.min(...years) : null;
  }, [payload]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Link not available</h1>
            <p className="text-muted-foreground mb-6">
              This shared dashboard link is invalid, disabled, or expired.
            </p>
            <Link to="/auth">
              <Button className="w-full">
                Sign up for Family Travel Tracker — it’s free!
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">
            {payload.owner.full_name || "Traveler"}’s Shared Dashboard
          </h1>
          <p className="text-muted-foreground">Read-only view. No account required.</p>
        </header>

        {payload.share.include_stats && (
          <div className="mb-8">
            <HeroSummaryCard
              countries={countries}
              familyMembers={[]}
              totalContinents={totalContinents}
              homeCountry={payload.owner.home_country}
              earliestYear={earliestYear}
              visitMemberMap={new globalThis.Map()}
              selectedMemberId={null}
              filterComponent={
                resolvedHome.hasStateTracking ? (
                  <div className="text-sm text-muted-foreground">
                    {statesVisitedCount}/50 {resolvedHome.iso2 === "US" ? "states" : "regions"}
                  </div>
                ) : undefined
              }
            />
          </div>
        )}

        {payload.share.include_countries && (
          <div className="mb-8">
            <InteractiveWorldMap
              countries={countries}
              wishlist={[]}
              homeCountry={payload.owner.home_country}
              onRefetch={() => {}}
              readOnly
              stateVisitsOverride={payload.state_visits}
            />

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {visitedCountriesCount} visited countries across {totalContinents} continents.
            </div>
          </div>
        )}

        {payload.share.include_memories && (
          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">Memories</h2>
            <PublicPhotoGallery countries={countries} photos={payload.photos || []} />
          </section>
        )}
      </div>
    </div>
  );
};

export default SharedDashboard;
