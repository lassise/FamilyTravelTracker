import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import { getAirportInfo, extractAirportCodes, isSameCountry } from "@/lib/airportData";
import { getAllCountries } from "@/lib/countriesData";

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedTravelData {
    country: string;
    countryCode: string;
    city: string;
    startDate: string | null;
    endDate: string | null;
    tripName: string;
    source: 'flight' | 'hotel' | 'country';
    isDomestic: boolean;
}

interface TripImportDialogProps {
    onTripCreated?: () => void;
    onCountryDetected?: (data: ParsedTravelData) => void;
    homeCountry?: string | null;
    trigger?: React.ReactNode;
}

// Get all country names for matching
const allCountries = getAllCountries();
const countryNameMap = new Map<string, { name: string; code: string }>();
allCountries.forEach(c => {
    countryNameMap.set(c.name.toLowerCase(), { name: c.name, code: c.code });
});

// Additional country name variations
const countryAliases: Record<string, string> = {
    'usa': 'United States',
    'uk': 'United Kingdom',
    'uae': 'United Arab Emirates',
    'czech republic': 'Czechia',
    'holland': 'Netherlands',
};

export const TripImportDialog = ({ onTripCreated, onCountryDetected, homeCountry, trigger }: TripImportDialogProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("paste");
    const [pasteContent, setPasteContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [processingStatus, setProcessingStatus] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
        }
    };

    const extractTextFromPdf = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(" ");
                fullText += pageText + "\n";
            }
            return fullText;
        } catch (error) {
            console.error("Error reading PDF:", error);
            throw new Error(`Failed to read PDF: ${file.name}`);
        }
    };

    // Extract dates in various formats
    const extractDates = (text: string): { startDate: string | null; endDate: string | null } => {
        // Helper to parse various date formats
        const parseDateFromMatch = (dateText: string): string | null => {
            // Remove day names (Monday, Tuesday, etc.)
            const cleanedText = dateText.replace(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/i, '').trim();

            // Try "Month Day, Year" (e.g., "March 25, 2025")
            const monthDayYear = cleanedText.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
            if (monthDayYear) {
                const monthNum = parseMonth(monthDayYear[1]);
                if (monthNum) {
                    return `${monthDayYear[3]}-${monthNum}-${monthDayYear[2].padStart(2, '0')}`;
                }
            }

            // Try "M/D/YYYY" or "MM/DD/YYYY" (e.g., "3/25/2025")
            const slashDate = cleanedText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (slashDate) {
                return `${slashDate[3]}-${slashDate[1].padStart(2, '0')}-${slashDate[2].padStart(2, '0')}`;
            }

            return null;
        };

        // ARRIVAL / DEPARTURE pattern (e.g., "ARRIVAL Tuesday, March 25, 2025")
        const arrivalMatch = text.match(/arrival[:\s]+(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
        const departureMatch = text.match(/departure[:\s]+(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

        if (arrivalMatch || departureMatch) {
            return {
                startDate: arrivalMatch ? parseDateFromMatch(arrivalMatch[1]) : null,
                endDate: departureMatch ? parseDateFromMatch(departureMatch[1]) : null,
            };
        }

        // Check-in / Check-out pattern (e.g., "Check in Sep 7, 2022")
        const checkInMatch = text.match(/check\s*-?\s*in[:\s]+(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
        const checkOutMatch = text.match(/check\s*-?\s*out[:\s]+(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

        if (checkInMatch || checkOutMatch) {
            return {
                startDate: checkInMatch ? parseDateFromMatch(checkInMatch[1]) : null,
                endDate: checkOutMatch ? parseDateFromMatch(checkOutMatch[1]) : null,
            };
        }

        // Date range pattern (e.g., "Sep 7–11, 2022")
        const rangeMatch = text.match(/([A-Za-z]+)\s+(\d{1,2})[–\-](\d{1,2}),?\s+(\d{4})/i);
        if (rangeMatch) {
            const [, month, startDay, endDay, year] = rangeMatch;
            const monthNum = parseMonth(month);
            if (monthNum) {
                return {
                    startDate: `${year}-${monthNum}-${startDay.padStart(2, '0')}`,
                    endDate: `${year}-${monthNum}-${endDay.padStart(2, '0')}`,
                };
            }
        }

        // DD/MM/YYYY format (e.g., "26/09/2025")
        const ddmmyyyyMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (ddmmyyyyMatch) {
            const [, day, month, year] = ddmmyyyyMatch;
            return {
                startDate: `${year}-${month}-${day}`,
                endDate: null,
            };
        }

        // Single Month Day, Year format anywhere in text (e.g., "Jan 29, 2026")
        const monthDayMatch = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
        if (monthDayMatch) {
            const [, month, day, year] = monthDayMatch;
            const monthNum = parseMonth(month);
            if (monthNum) {
                return {
                    startDate: `${year}-${monthNum}-${day.padStart(2, '0')}`,
                    endDate: null,
                };
            }
        }

        return { startDate: null, endDate: null };
    };

    const parseMonth = (month: string): string | null => {
        const months: Record<string, string> = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        return months[month.toLowerCase().substring(0, 3)] || null;
    };

    const parseDateString = (dateStr: string): string | null => {
        const match = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (match) {
            const [, month, day, year] = match;
            const monthNum = parseMonth(month);
            if (monthNum) {
                return `${year}-${monthNum}-${day.padStart(2, '0')}`;
            }
        }
        return null;
    };

    // Find country name in text
    const findCountryInText = (text: string): { country: string; code: string; city: string } | null => {
        const lowerText = text.toLowerCase();

        // First check for country in address patterns
        const addressMatch = text.match(/address[:\s]+(.+)/i);
        if (addressMatch) {
            const addressLine = addressMatch[1];
            // Try to find country in the address (usually last part after comma)
            const parts = addressLine.split(',').map(p => p.trim());
            for (let i = parts.length - 1; i >= 0; i--) {
                const part = parts[i].toLowerCase().trim();
                // Check direct country name match
                for (const [name, info] of countryNameMap.entries()) {
                    if (part === name || part.includes(name)) {
                        // Get city from previous part
                        const city = i > 0 ? parts[i - 1].trim() : '';
                        return { country: info.name, code: info.code, city };
                    }
                }
            }
        }

        // Look for country names anywhere in text
        for (const [name, info] of countryNameMap.entries()) {
            // Avoid matching partial words - use word boundaries
            const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(lowerText)) {
                // Try to extract city from context
                const cityMatch = text.match(new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?),?\\s*${name}`, 'i'));
                const city = cityMatch ? cityMatch[1] : '';
                return { country: info.name, code: info.code, city };
            }
        }

        // Check aliases
        for (const [alias, countryName] of Object.entries(countryAliases)) {
            if (lowerText.includes(alias)) {
                const info = countryNameMap.get(countryName.toLowerCase());
                if (info) {
                    return { country: info.name, code: info.code, city: '' };
                }
            }
        }

        return null;
    };

    // Extract place/hotel name
    const extractPlaceName = (text: string): string => {
        // Look for common patterns
        const lines = text.split('\n').filter(l => l.trim());

        // First non-empty line is often the name
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            // If it's not a label like "Confirmation" or "Booking", use it
            if (firstLine.length < 50 && !firstLine.match(/^(confirmation|booking|reservation|check|address|phone|duration)/i)) {
                return firstLine;
            }
        }

        return '';
    };

    const processContent = async () => {
        if (activeTab === "paste" && !pasteContent.trim()) {
            toast({ title: "Please paste some text first", variant: "destructive" });
            return;
        }
        if (activeTab === "upload" && files.length === 0) {
            toast({ title: "Please select files to upload", variant: "destructive" });
            return;
        }

        setLoading(true);
        setProcessingStatus("Analyzing...");

        try {
            let textToAnalyze = "";

            if (activeTab === "paste") {
                textToAnalyze = pasteContent;
            } else {
                for (const file of files) {
                    setProcessingStatus(`Reading ${file.name}...`);
                    if (file.type === "application/pdf") {
                        const text = await extractTextFromPdf(file);
                        textToAnalyze += `\n${text}\n`;
                    } else if (file.type === "text/plain") {
                        const text = await file.text();
                        textToAnalyze += `\n${text}\n`;
                    }
                }
            }

            console.log("[TripImportDialog] Analyzing text:", textToAnalyze.substring(0, 500));

            // Try to detect airports first (boarding pass)
            const detectedAirports = extractAirportCodes(textToAnalyze);
            console.log("[TripImportDialog] Detected airports:", detectedAirports);

            let parsedData: ParsedTravelData | null = null;

            if (detectedAirports.length >= 2) {
                // Flight detected
                const uniqueAirports = [...new Set(detectedAirports)];
                const departureCode = uniqueAirports[0];
                const arrivalCode = uniqueAirports[uniqueAirports.length - 1];

                if (departureCode !== arrivalCode) {
                    const arrivalInfo = getAirportInfo(arrivalCode);
                    const departureInfo = getAirportInfo(departureCode);

                    if (arrivalInfo) {
                        const dates = extractDates(textToAnalyze);
                        parsedData = {
                            country: arrivalInfo.country,
                            countryCode: arrivalInfo.countryCode,
                            city: arrivalInfo.city,
                            startDate: dates.startDate,
                            endDate: dates.endDate,
                            tripName: `Trip to ${arrivalInfo.city}`,
                            source: 'flight',
                            isDomestic: isSameCountry(departureCode, arrivalCode),
                        };
                    }
                }
            }

            // If no flight detected, try to find country name (hotel reservation, etc.)
            if (!parsedData) {
                const countryInfo = findCountryInText(textToAnalyze);
                console.log("[TripImportDialog] Detected country:", countryInfo);

                if (countryInfo) {
                    const dates = extractDates(textToAnalyze);
                    const placeName = extractPlaceName(textToAnalyze);

                    parsedData = {
                        country: countryInfo.country,
                        countryCode: countryInfo.code,
                        city: countryInfo.city,
                        startDate: dates.startDate,
                        endDate: dates.endDate,
                        tripName: placeName ? `Stay at ${placeName}` : `Trip to ${countryInfo.city || countryInfo.country}`,
                        source: 'hotel',
                        isDomestic: false,
                    };
                }
            }

            if (!parsedData) {
                throw new Error("Could not detect any travel information. Please ensure the text contains airport codes, country names, or addresses.");
            }

            console.log("[TripImportDialog] Parsed data:", parsedData);

            // Check if this is the home country
            if (homeCountry && parsedData.country.toLowerCase() === homeCountry.toLowerCase()) {
                toast({
                    title: "Home Country Detected",
                    description: `${parsedData.city || 'This location'} is within your home country (${homeCountry}). This won't be added to your Countries list.`,
                    duration: 6000,
                });
                setOpen(false);
                setPasteContent("");
                setFiles([]);
                return;
            }

            // If callback provided, use it to open the Add Country dialog
            if (onCountryDetected) {
                const dateInfo = parsedData.startDate
                    ? (parsedData.endDate
                        ? ` from ${parsedData.startDate} to ${parsedData.endDate}`
                        : ` on ${parsedData.startDate}`)
                    : '';

                toast({
                    title: `${parsedData.source === 'flight' ? 'Flight' : 'Trip'} Detected!`,
                    description: `${parsedData.city ? parsedData.city + ', ' : ''}${parsedData.country}${dateInfo}`,
                    duration: 5000,
                });

                setOpen(false);
                setPasteContent("");
                setFiles([]);
                onCountryDetected(parsedData);
            } else {
                toast({
                    title: "Travel Detected",
                    description: `Detected: ${parsedData.city}, ${parsedData.country}. No handler attached.`,
                    duration: 8000,
                });
            }

        } catch (error: any) {
            console.error("[TripImportDialog] Import error:", error);
            toast({
                title: "Import Failed",
                description: error.message || "Failed to parse travel information.",
                variant: "destructive",
                duration: 10000,
            });
        } finally {
            setLoading(false);
            setProcessingStatus("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Import Travel Document
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Travel Document</DialogTitle>
                    <DialogDescription>
                        Paste text from boarding passes, hotel reservations, or other travel documents to quickly add a country.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="paste">Paste Text</TabsTrigger>
                        <TabsTrigger value="upload">Upload Files</TabsTrigger>
                    </TabsList>

                    <TabsContent value="paste" className="space-y-4 py-4">
                        <Textarea
                            placeholder="Paste your travel document here...

Examples:
• Boarding pass: LAS → FLL, Jan 29
• Hotel: Address: Antigua Guatemala, Guatemala
• Flight confirmation: Munich International to Lisbon Airport"
                            className="min-h-[200px]"
                            value={pasteContent}
                            onChange={(e) => setPasteContent(e.target.value)}
                        />
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4 py-4">
                        <div
                            className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-sm font-medium">Click to upload PDF or Text files</p>
                            <p className="text-xs text-muted-foreground mt-1">Boarding passes, hotel confirmations, etc.</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.txt"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Selected files:</p>
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                                        <FileText className="h-3 w-3" />
                                        <span className="truncate">{f.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex flex-col gap-2">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{processingStatus}</span>
                        </div>
                    )}
                    <Button onClick={processContent} disabled={loading} className="w-full">
                        {loading ? "Analyzing..." : "Detect Country"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Re-export for backwards compatibility (renamed type)
export type ParsedFlightData = ParsedTravelData;
