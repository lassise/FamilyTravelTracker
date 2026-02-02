
import { TripSuggestion } from "@/lib/scanners/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Calendar, Image as ImageIcon, Mail } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";

interface TripSuggestionListProps {
    suggestions: TripSuggestion[];
    onAccept: (trip: TripSuggestion) => void;
    onReject: (trip: TripSuggestion) => void;
}

export function TripSuggestionList({ suggestions, onAccept, onReject }: TripSuggestionListProps) {
    if (suggestions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No new trips found.
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {suggestions.map((trip) => (
                <Card key={trip.id} className="overflow-hidden border-l-4 border-l-primary">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border shadow-sm flex items-center justify-center bg-muted">
                            <CountryFlag countryCode={trip.countryCode || ''} countryName={trip.countryName} size="lg" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{trip.tripName || trip.countryName}</h4>
                            <div className="flex items-center text-sm text-muted-foreground gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>
                                    {trip.visitDate}
                                    {trip.endDate && trip.endDate !== trip.visitDate ? ` - ${trip.endDate}` : ''}
                                </span>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                                {trip.sourceType === 'photo_exif' ? <ImageIcon className="h-3 w-3" /> :
                                    trip.sourceType === 'email' ? <Mail className="h-3 w-3" /> : null}
                                <span>{trip.sourceLabel}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onReject(trip)}
                                title="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                className="gap-1 h-8 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => onAccept(trip)}
                                title="Add Trip"
                            >
                                <Check className="h-3 w-3" />
                                Add
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
