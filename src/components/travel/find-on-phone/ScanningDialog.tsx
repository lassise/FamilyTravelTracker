
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { Loader2, Camera, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { TripSuggestionList } from "./TripSuggestionList";
import { photoScanner } from "@/lib/scanners/photoScanner";
import { emailScanner } from "@/lib/scanners/emailScanner";
import { tripSuggestionEngine } from "@/lib/tripSuggestionEngine";
import { TripSuggestion } from "@/lib/scanners/types";
import { useToast } from "@/hooks/use-toast";

interface ScanningDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type ScanStage = 'initial' | 'scanning_photos' | 'scanning_emails' | 'analyzing' | 'review' | 'complete';

export function ScanningDialog({ open, onOpenChange }: ScanningDialogProps) {
    const [stage, setStage] = useState<ScanStage>('initial');
    const [progress, setProgress] = useState(0);
    const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
    const { toast } = useToast();

    const resetstate = () => {
        setStage('initial');
        setProgress(0);
        setSuggestions([]);
    };

    useEffect(() => {
        if (open && stage === 'initial') {
            // Just reset if re-opening
            setProgress(0);
            setSuggestions([]);
        }
    }, [open]);

    const startScan = async () => {
        setStage('scanning_photos');
        setProgress(0);

        try {
            // 1. Scan Photos
            const photos = await photoScanner.scanPhotos((count) => {
                // Mock progress mapping 0-6 mock items
                const percent = Math.min(100, (count / 6) * 100);
                setProgress(percent);
            });

            // 2. Scan Emails
            setStage('scanning_emails');
            setProgress(0);
            const emails = await emailScanner.scanEmails((count) => {
                // Mock progress mapping 0-3 mock items
                const percent = Math.min(100, (count / 3) * 100);
                setProgress(percent);
            });

            // 3. Analyze
            setStage('analyzing');
            setProgress(100);

            // Short delay for effect
            setTimeout(() => {
                const results = tripSuggestionEngine.generateSuggestions(photos, emails);
                setSuggestions(results);
                setStage('review');
            }, 1000);

        } catch (e) {
            console.error("Scanning failed", e);
            toast({
                title: "Scanning failed",
                description: "An error occurred while scanning your data.",
                variant: "destructive"
            });
            onOpenChange(false);
        }
    };

    const handleAccept = (trip: TripSuggestion) => {
        toast({
            title: "Trip Added",
            description: `Successfully added ${trip.countryName} to your travel history.`,
        });
        setSuggestions(prev => prev.filter(t => t.id !== trip.id));
        if (suggestions.length <= 1) {
            setStage('complete');
        }
    };

    const handleReject = (trip: TripSuggestion) => {
        setSuggestions(prev => prev.filter(t => t.id !== trip.id));
        if (suggestions.length <= 1) {
            setStage('complete');
        }
    };

    const renderContent = () => {
        switch (stage) {
            case 'initial':
                return (
                    <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                        <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                            <Sparkles className="w-12 h-12 text-primary" />
                        </div>
                        <div className="space-y-2 max-w-sm">
                            <h3 className="font-semibold text-lg">Discover Past Trips</h3>
                            <p className="text-muted-foreground text-sm">
                                We can scan your device photos and emails to find trips you might have forgotten to log.
                                <br /><br />
                                <em className="text-xs">Note: This is a demo feature using sample data.</em>
                            </p>
                        </div>
                        <Button size="lg" onClick={startScan} className="w-full max-w-xs">
                            Start Scan
                        </Button>
                    </div>
                );

            case 'scanning_photos':
                return (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                        <div className="p-4 bg-blue-100 rounded-full text-blue-600 animate-bounce">
                            <Camera className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 w-full max-w-xs">
                            <h3 className="font-medium">Scanning Photos...</h3>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">Looking for foreign locations</p>
                        </div>
                    </div>
                );

            case 'scanning_emails':
                return (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                        <div className="p-4 bg-purple-100 rounded-full text-purple-600 animate-pulse">
                            <Mail className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 w-full max-w-xs">
                            <h3 className="font-medium">Checking Emails...</h3>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">Searching for itineraries & confirmations</p>
                        </div>
                    </div>
                );

            case 'analyzing':
                return (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <h3 className="font-medium">Analyzing Trips...</h3>
                    </div>
                );

            case 'review':
                return (
                    <div className="py-2">
                        <TripSuggestionList
                            suggestions={suggestions}
                            onAccept={handleAccept}
                            onReject={handleReject}
                        />
                    </div>
                );

            case 'complete':
                return (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                        <div className="p-4 bg-green-100 rounded-full text-green-600">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h3 className="font-semibold text-lg">All caught up!</h3>
                        <p className="text-muted-foreground text-sm">
                            No more suggestions found.
                        </p>
                        <Button onClick={() => onOpenChange(false)} variant="outline">
                            Close
                        </Button>
                    </div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setTimeout(resetstate, 300);
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Find Trips On My Phone</DialogTitle>
                    <DialogDescription>
                        {stage === 'review' ? `Found ${suggestions.length} potential trips` : ''}
                    </DialogDescription>
                </DialogHeader>

                {renderContent()}

            </DialogContent>
        </Dialog>
    );
}
