import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useTrips";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Plane,
  Calendar,
  MapPin,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
  Award
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInDays, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import PendingInvitesCard from "@/components/trips/PendingInvitesCard";

import { TripImportDialog } from "@/components/trips/TripImportDialog";

const Trips = () => {
  const { user, loading: authLoading } = useAuth();
  const { trips, loading: tripsLoading, deleteTrip, refetch } = useTrips();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("status") || "all");
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());

  const getTripDays = (trip: { start_date: string | null; end_date: string | null }) => {
    if (!trip.start_date || !trip.end_date) return null;
    try {
      const start = parseISO(trip.start_date);
      const end = parseISO(trip.end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      return differenceInDays(end, start) + 1;
    } catch {
      return null;
    }
  };

  const selectedTrips = trips.filter((t) => selectedTripIds.has(t.id));
  const longestOfSelected =
    selectedTrips.length >= 2
      ? selectedTrips.reduce<{ trip: (typeof trips)[0]; days: number } | null>((best, trip) => {
        const days = getTripDays(trip) ?? 0;
        if (!best || days > best.days) return { trip, days };
        return best;
      }, null)
      : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this trip?")) return;

    const { error } = await deleteTrip(id);
    if (error) {
      toast.error("Failed to delete trip");
    } else {
      toast.success("Trip deleted");
    }
  };

  const filterTrips = (status: string) => {
    if (status === "all") return trips;
    return trips.filter((t) => t.status === status);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "planning":
        return "secondary";
      case "upcoming":
        return "default";
      case "active":
        return "destructive";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (authLoading || tripsLoading) {
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Trips</h1>
            <p className="text-muted-foreground">
              Manage and view all your family adventures
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/trips/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Trip
            </Button>
          </div>
        </div>

        {/* Pending Invites */}
        <PendingInvitesCard onAccepted={refetch} />

        {/* Compare trips: checkboxes + which is longest */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Compare trips (find longest)
            </CardTitle>
            <CardDescription>
              Tick the trips you want to compare. The longest trip by duration will be shown below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTripIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedTripIds.size} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTripIds(new Set())}
                >
                  Clear selection
                </Button>
                {longestOfSelected && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Award className="h-4 w-4 text-primary" />
                    Longest: {longestOfSelected.trip.title}
                    {longestOfSelected.trip.destination && ` (${longestOfSelected.trip.destination})`}
                    {" — "}
                    <span className="text-primary">{longestOfSelected.days} days</span>
                  </div>
                )}
              </div>
            )}
            <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3">
              <ul className="space-y-2">
                {trips.map((trip) => {
                  const days = getTripDays(trip);
                  const isSelected = selectedTripIds.has(trip.id);
                  return (
                    <li key={trip.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`compare-${trip.id}`}
                        checked={isSelected}
                        onCheckedChange={() => {
                          setSelectedTripIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(trip.id)) next.delete(trip.id);
                            else next.add(trip.id);
                            return next;
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        htmlFor={`compare-${trip.id}`}
                        className="flex-1 text-sm cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span className="font-medium truncate">{trip.title}</span>
                        <span className="text-muted-foreground shrink-0">
                          {days != null ? `${days} days` : "—"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All ({trips.length})</TabsTrigger>
            <TabsTrigger value="planning">
              Planning ({filterTrips("planning").length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({filterTrips("upcoming").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterTrips("completed").length})
            </TabsTrigger>
          </TabsList>

          {["all", "planning", "upcoming", "completed"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {filterTrips(tab).length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Plane className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">No trips found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tab === "all"
                        ? "Start planning your first family adventure!"
                        : `No ${tab} trips yet.`}
                    </p>
                    <Button onClick={() => navigate("/trips/add")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Trip
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterTrips(tab).map((trip) => (
                    <Card
                      key={trip.id}
                      className="cursor-pointer hover:shadow-travel transition-all overflow-hidden group"
                      onClick={() => navigate(`/trips/${trip.id}`)}
                    >
                      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary/20">
                        {trip.cover_image ? (
                          <img
                            src={trip.cover_image}
                            alt={trip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Plane className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/trips/${trip.id}/edit`);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => handleDeleteTrip(trip.id, e)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1">
                            {trip.title}
                          </CardTitle>
                          <Badge variant={getStatusColor(trip.status)}>
                            {trip.status || "planning"}
                          </Badge>
                        </div>
                        {trip.destination && (
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="line-clamp-1">{trip.destination}</span>
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {trip.start_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(trip.start_date)}
                              {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Trips;
