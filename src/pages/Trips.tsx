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
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Trips = () => {
  const { user, loading: authLoading } = useAuth();
  const { trips, loading: tripsLoading, deleteTrip } = useTrips();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("status") || "all");

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Trips</h1>
            <p className="text-muted-foreground">
              Manage and view all your family adventures
            </p>
          </div>
          <Button onClick={() => navigate("/trips/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Trip
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    <Button onClick={() => navigate("/trips/new")}>
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
