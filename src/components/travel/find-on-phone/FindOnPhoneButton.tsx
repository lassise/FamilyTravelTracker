
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { useState } from "react";
import { ScanningDialog } from "./ScanningDialog";

export function FindOnPhoneButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
                onClick={() => setIsOpen(true)}
            >
                <Smartphone className="h-4 w-4" />
                Find On My Phone
            </Button>

            <ScanningDialog open={isOpen} onOpenChange={setIsOpen} />
        </>
    );
}
