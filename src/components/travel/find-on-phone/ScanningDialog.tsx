import { useGoogleLogin } from '@react-oauth/google';
import { GmailService } from "@/lib/services/gmail";
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
    const [isGmailConnected, setIsGmailConnected] = useState(GmailService.isAuthenticated());
    const { toast } = useToast();

    // Check connection status on open
    useEffect(() => {
        if (open) {
            setIsGmailConnected(GmailService.isAuthenticated());
        }
    }, [open]);

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            GmailService.setAccessToken(codeResponse.access_token);
            setIsGmailConnected(true);
            toast({ title: "Gmail Connected", description: "We can now scan your emails for trips." });
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: 'https://www.googleapis.com/auth/gmail.readonly'
    });

    const resetstate = () => {
        setStage('initial');
        setProgress(0);
        setSuggestions([]);
    };

    // ... existing useEffect for reset

    const startScan = async () => {
        setStage('scanning_photos');
        setProgress(0);

        try {
            // 1. Scan Photos
            const photos = await photoScanner.scanPhotos((count) => {
                // Mock progress
                const percent = Math.min(100, (count / 6) * 100);
                setProgress(percent);
            });

            // 2. Scan Emails
            setStage('scanning_emails');
            setProgress(0);

            // Gmail scan will use real API if connected, otherwise mock
            const emails = await emailScanner.scanEmails((count) => {
                // For mock, we know the count. For real, we might not know total initially, 
                // but emailScanner returns progress feedback.
                // Let's just animate progress for now to keep it simple or trust the callback
                const percent = Math.min(100, count * 10); // arbitrary scaling
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

    // ... existing handlers

    const renderContent = () => {
        switch (stage) {
            case 'initial':
                return (
                    <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                        <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                            <Sparkles className="w-12 h-12 text-primary" />
                        </div>
                        <div className="space-y-4 max-w-sm">
                            <div>
                                <h3 className="font-semibold text-lg">Discover Past Trips</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    We can scan your device photos and emails to find trips you might have forgotten to log.
                                </p>
                            </div>

                            {!isGmailConnected && (
                                <div className="p-3 bg-muted rounded-lg border text-left space-y-2">
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                        <Mail className="w-4 h-4" />
                                        Connect Gmail
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        To find flight confirmations and bookings, detailed access is required.
                                    </p>
                                    <Button variant="secondary" size="sm" onClick={() => login()} className="w-full">
                                        Sign in with Google
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        (Optional. We only read travel emails.)
                                    </p>
                                </div>
                            )}

                            {isGmailConnected && (
                                <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Gmail Connected
                                </div>
                            )}
                        </div>
                        <Button size="lg" onClick={startScan} className="w-full max-w-xs">
                            Start Scan
                        </Button>
                    </div>
                );

            // ... other cases remain same
            case 'scanning_photos':
                return (
// ... (rest of the file content matches existing, essentially just replacing the top part and initial case)
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
