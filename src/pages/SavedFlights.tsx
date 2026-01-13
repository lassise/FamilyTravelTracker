import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plane, 
  Bell, 
  BellOff, 
  Trash2, 
  Calendar, 
  DollarSign,
  ArrowRight,
  AlertCircle,
  Search
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedFlight {
  id: string;
  origin: string;
  destination: string;
  outbound_date: string | null;
  return_date: string | null;
  trip_type: string | null;
  passengers: number | null;
  cabin_class: string | null;
  target_price: number | null;
  last_price: number | null;
  price_alert_enabled: boolean | null;
  alert_email: string | null;
  notes: string | null;
  created_at: string;
}

const SavedFlights = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [savedFlights, setSavedFlights] = useState<SavedFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flightToDelete, setFlightToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSavedFlights();
    }
  }, [user]);

  const fetchSavedFlights = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_flights")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedFlights(data || []);
    } catch (error) {
      console.error("Error fetching saved flights:", error);
      toast.error("Failed to load saved flights");
    } finally {
      setLoading(false);
    }
  };

  const toggleAlertEnabled = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("saved_flights")
        .update({ price_alert_enabled: !currentValue })
        .eq("id", id);

      if (error) throw error;

      setSavedFlights(prev =>
        prev.map(f => f.id === id ? { ...f, price_alert_enabled: !currentValue } : f)
      );

      toast.success(`Price alerts ${!currentValue ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling alert:", error);
      toast.error("Failed to update alert setting");
    }
  };

  const handleDeleteClick = (id: string) => {
    setFlightToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!flightToDelete) return;

    try {
      const { error } = await supabase
        .from("saved_flights")
        .delete()
        .eq("id", flightToDelete);

      if (error) throw error;

      setSavedFlights(prev => prev.filter(f => f.id !== flightToDelete));
      toast.success("Saved flight removed");
    } catch (error) {
      console.error("Error deleting flight:", error);
      toast.error("Failed to delete saved flight");
    } finally {
      setDeleteDialogOpen(false);
      setFlightToDelete(null);
    }
  };

  const searchFlight = (flight: SavedFlight) => {
    const params = new URLSearchParams({
      origin: flight.origin,
      destination: flight.destination,
      ...(flight.outbound_date && { departDate: flight.outbound_date }),
      ...(flight.return_date && { returnDate: flight.return_date }),
      tripType: flight.trip_type || "roundtrip",
      passengers: String(flight.passengers || 1),
    });
    navigate(`/flights?${params.toString()}`);
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Saved Flights & Price Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor prices and get notified when they drop
            </p>
          </div>
          <Button onClick={() => navigate("/flights")} className="gap-2">
            <Search className="h-4 w-4" />
            Search Flights
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : savedFlights.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plane className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Saved Flights Yet
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Search for flights and set price alerts to get notified when prices drop to your target.
              </p>
              <Button onClick={() => navigate("/flights")}>
                Search Flights
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {savedFlights.map(flight => (
              <Card key={flight.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Flight Route Info */}
                    <div className="flex-1 p-4 lg:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <span className="text-foreground">{flight.origin}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{flight.destination}</span>
                        </div>
                        {flight.trip_type === "roundtrip" && (
                          <Badge variant="secondary">Round Trip</Badge>
                        )}
                        {flight.trip_type === "oneway" && (
                          <Badge variant="outline">One Way</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {flight.outbound_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(flight.outbound_date), "MMM d, yyyy")}
                              {flight.return_date && (
                                <> - {format(new Date(flight.return_date), "MMM d, yyyy")}</>
                              )}
                            </span>
                          </div>
                        )}
                        {flight.passengers && flight.passengers > 1 && (
                          <div className="flex items-center gap-1.5">
                            <span>{flight.passengers} passengers</span>
                          </div>
                        )}
                      </div>

                      {/* Price Info */}
                      <div className="flex items-center gap-4 mt-4">
                        {flight.last_price && (
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              Last seen: ${flight.last_price}
                            </span>
                          </div>
                        )}
                        {flight.target_price && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">
                              Alert at: ${flight.target_price}
                            </span>
                          </div>
                        )}
                      </div>

                      {flight.alert_email && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Alerts sent to: {flight.alert_email}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center justify-between gap-3 p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        {flight.price_alert_enabled ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          Alerts {flight.price_alert_enabled ? "On" : "Off"}
                        </span>
                        <Switch
                          checked={flight.price_alert_enabled || false}
                          onCheckedChange={() => toggleAlertEnabled(flight.id, flight.price_alert_enabled || false)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => searchFlight(flight)}
                          className="gap-1"
                        >
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(flight.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Saved Flight?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the saved flight and disable any price alerts. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default SavedFlights;
