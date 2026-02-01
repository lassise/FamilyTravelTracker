import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { TripEntryChoice, type TripEntryMode } from "@/components/trips/TripEntryChoice";
import { QuickAddTripForm } from "@/components/trips/QuickAddTripForm";
import { FullTripForm } from "@/components/trips/FullTripForm";
import { PostTripActions } from "@/components/trips/PostTripActions";
import { useFamilyData } from "@/hooks/useFamilyData";
import { useTrips } from "@/hooks/useTrips";
import type { Trip } from "@/hooks/useTrips";
import { Loader2 } from "lucide-react";

type Screen = "choice" | "quick" | "full" | "post-actions";

/**
 * Add Trip page: single entry point for logging a trip.
 * - Choice: Quick Add | Add with Details
 * - Quick/Full form: save creates Trip + Leg(s) + country_visits
 * - PostTripActions: Add Another Trip | Save & Finish
 */
const POST_ACTIONS_STEP = "post-actions";

const AddTrip = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { familyMembers, loading: familyLoading } = useFamilyData();
  const { trips, refetch: refetchTrips } = useTrips();

  const [screen, setScreen] = useState<Screen>("choice");
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [firstCountryLabel, setFirstCountryLabel] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Sync from URL so "Add country" screen shows after save even on refresh
  useEffect(() => {
    const step = searchParams.get("step");
    const addLegToId = searchParams.get(ADD_LEG_PARAM);
    if (step === POST_ACTIONS_STEP && trips?.length > 0) {
      setScreen("post-actions");
      setCurrentTrip((prev) => prev?.id ? prev : trips[0]);
      setFirstCountryLabel((prev) => prev || (trips[0]?.destination ?? ""));
    } else if (addLegToId && trips?.length > 0) {
      const trip = trips.find((t) => t.id === addLegToId) ?? trips[0];
      if (trip) {
        setCurrentTrip(trip);
        setFirstCountryLabel(trip.destination ?? "");
        setScreen("add-leg");
        setSearchParams((p) => {
          const next = new URLSearchParams(p);
          next.delete(ADD_LEG_PARAM);
          return next;
        }, { replace: true });
      }
    }
  }, [searchParams, trips]);

  // If we're on post-actions but currentTrip was lost (e.g. remount), use latest trip
  useEffect(() => {
    if (screen === "post-actions" && !currentTrip?.id && trips?.length > 0) {
      const fallback = trips[0];
      setCurrentTrip(fallback);
      setFirstCountryLabel(fallback?.destination ?? "");
    }
  }, [screen, currentTrip?.id, trips]);

  const handleEntrySelect = (mode: TripEntryMode) => {
    if (mode === "quick") setScreen("quick");
    else setScreen("full");
  };

  const handleQuickOrFullSuccess = (trip: Trip, _familyMemberIds: string[]) => {
    setCurrentTrip(trip);
    setFirstCountryLabel(trip?.destination ?? "");
    setScreen("post-actions");
    setSearchParams({ step: POST_ACTIONS_STEP }, { replace: true });
    refetchTrips();
  };

  const handleAddNewTrip = () => {
    setCurrentTrip(null);
    setCurrentFamilyMemberIds([]);
    setFirstCountryLabel("");
    setScreen("choice");
    setSearchParams({}, { replace: true });
  };

  const handleFinish = () => {
    navigate("/trips");
  };

  const familyMembersList = familyMembers.map((m) => ({ id: m.id, name: m.name }));

  if (authLoading || familyLoading) {
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Add a New Trip</h1>
          <p className="text-muted-foreground mt-2">
            Log a trip (quick or with details). Countries are always part of a trip.
          </p>
        </div>

        {screen === "choice" && <TripEntryChoice onSelect={handleEntrySelect} />}

        {screen === "quick" && (
          <QuickAddTripForm
            familyMembers={familyMembersList}
            onSuccess={handleQuickOrFullSuccess}
            onBack={() => setScreen("choice")}
          />
        )}

        {screen === "full" && (
          <FullTripForm
            familyMembers={familyMembersList}
            onSuccess={handleQuickOrFullSuccess}
            onBack={() => setScreen("choice")}
          />
        )}

        {screen === "post-actions" && (currentTrip || trips?.[0]) && (
          <PostTripActions
            currentTrip={currentTrip ?? trips[0]!}
            firstCountryLabel={firstCountryLabel}
            onAddNewTrip={handleAddNewTrip}
            onFinish={handleFinish}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default AddTrip;
