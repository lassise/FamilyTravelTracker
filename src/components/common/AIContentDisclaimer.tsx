import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Disclaimer for AI-generated content
 * Use this component wherever AI-generated travel suggestions are displayed
 */
export const AIContentDisclaimer = ({ className }: { className?: string }) => {
    return (
        <Alert variant="default" className={className}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
                <strong>AI-Generated Content:</strong> These suggestions are provided by AI and may not reflect real, verified locations or accurate information. Please verify all details independently before making travel plans or bookings.
            </AlertDescription>
        </Alert>
    );
};
