import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import { getAirportInfo, extractAirportCodes, isSameCountry } from "@/lib/airportData";
import { getAllCountries } from "@/lib/countriesData";
import { supabase } from "@/integrations/supabase/client";

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
    isDuplicate?: boolean;
    missingYear?: boolean;
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

    // Missing Year Confirmation State
    const [showYearInput, setShowYearInput] = useState(false);
    const [manualYear, setManualYear] = useState<string>(new Date().getFullYear().toString());
    const [pendingParsedData, setPendingParsedData] = useState<ParsedTravelData | null>(null);

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
    const extractDates = (text: string): { startDate: string | null; endDate: string | null; missingYear: boolean } => {
        let missingYear = false;
        const currentYear = new Date().getFullYear();

        const parseMonth = (month: string): string | null => {
            const months: Record<string, string> = {
                'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
            };
            return months[month.toLowerCase().substring(0, 3)] || null;
        };

        const createDateString = (year: string | undefined, month: string, day: string): string | null => {
            const monthNum = parseMonth(month);
            if (!monthNum) return null;

            let finalYear = year;
            if (!finalYear) {
                finalYear = currentYear.toString();
                missingYear = true;
            }
            return `${finalYear}-${monthNum}-${day.padStart(2, '0')}`;
        };

        const parseDateFromMatch = (dateText: string): string | null => {
            // Remove day names
            const cleanedText = dateText.replace(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\.?,?\s*/i, '').trim();

            // Try "Month Day, Year" or "Month Day"
            // Matches: "May 10, 2025", "May 10"
            const match = cleanedText.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
            if (match) {
                return createDateString(match[3], match[1], match[2]);
            }

            // M/D/YYYY
            const slashDate = cleanedText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (slashDate) {
                return `${slashDate[3]}-${slashDate[1].padStart(2, '0')}-${slashDate[2].padStart(2, '0')}`;
            }

            return null;
        };

        // ARRIVAL / DEPARTURE pattern
        const arrivalMatch = text.match(/arrival[:\s]+(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i);
        const departureMatch = text.match(/departure[:\s]+(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i);

        if (arrivalMatch || departureMatch) {
            return {
                startDate: arrivalMatch ? parseDateFromMatch(arrivalMatch[1]) : null,
                endDate: departureMatch ? parseDateFromMatch(departureMatch[1]) : null,
                missingYear
            };
        }

        // Check-in / Check-out pattern
        const checkInMatch = text.match(/check\s*-?\s*in[:\s]+(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i);
        const checkOutMatch = text.match(/check\s*-?\s*out[:\s]+(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i);

        if (checkInMatch || checkOutMatch) {
            return {
                startDate: checkInMatch ? parseDateFromMatch(checkInMatch[1]) : null,
                endDate: checkOutMatch ? parseDateFromMatch(checkOutMatch[1]) : null,
                missingYear
            };
        }

        // Date range pattern (Sep 7-11 or Sep 7 - 11, 2024)
        const rangeMatch = text.match(/([A-Za-z]+)\s+(\d{1,2})\s*[–\-]\s*(\d{1,2})(?:,?\s+(\d{4}))?/i);
        if (rangeMatch) {
            const [, month, startDay, endDay, year] = rangeMatch;
            const sDate = createDateString(year, month, startDay);
            const eDate = createDateString(year, month, endDay);
            if (sDate && eDate) {
                return { startDate: sDate, endDate: eDate, missingYear };
            }
        }

        // Full multi-date range (e.g. "May 10 ... May 11")
        const allDates = text.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/gi);
        if (allDates && allDates.length >= 2) {
            // Find ALL date components in the text to avoid losing the year
            const datesWithYears: string[] = [];
            const regex = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/gi;
            let m;
            while ((m = regex.exec(text)) !== null) {
                const d = createDateString(m[3], m[1], m[2]);
                if (d) datesWithYears.push(d);
            }

            if (datesWithYears.length >= 2) {
                const startDate = datesWithYears[0];
                const endDate = datesWithYears[datesWithYears.length - 1];
                return { startDate, endDate, missingYear };
            }
        }

        // Single Month Day
        const monthDayMatch = text.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
        if (monthDayMatch) {
            const startDate = createDateString(monthDayMatch[3], monthDayMatch[1], monthDayMatch[2]);
            if (startDate) return { startDate, endDate: null, missingYear };
        }

        return { startDate: null, endDate: null, missingYear: false };
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

    // Helper: Determine confidence level of local parsing
    const calculateConfidence = (data: ParsedTravelData | null, text: string): 'high' | 'low' | 'none' => {
        if (!data) return 'none';

        // High Confidence Scenarios:
        // 1. It's a domestic flight (identified airports in same home country)
        if (data.source === 'flight') {
            if (data.isDomestic) return 'high';
            // International flights should use AI to resolve complex stopovers/overnight logistics
            return 'low';
        }

        // 2. Explicit address marker found in text
        if (text.match(/address[:\s]+/i)) return 'high';

        // 3. Explicit "Check-in" dates found matching the trip
        if (text.match(/check\s*-?\s*in/i) && data.startDate) return 'high';

        // Low Confidence:
        // Just matched a country name loosely in the text
        return 'low';
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
        setProcessingStatus("Reading content...");
        let textToAnalyze = "";

        try {
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
        } catch (readError) {
            console.error("Error reading input:", readError);
            toast({ title: "Failed to read input files", variant: "destructive" });
            setLoading(false);
            return;
        }

        // STEP 1: Local Parsing (Fast, Free, "Hard Coded")
        setProcessingStatus("Scanning locally...");
        const localData = parseLocally(textToAnalyze);
        const confidence = calculateConfidence(localData, textToAnalyze);

        if (confidence === 'high' && localData) {
            console.log("High confidence local match found:", localData);
            handleSuccess(localData);
            setLoading(false);
            setProcessingStatus("");
            return;
        }

        // STEP 2: AI Parsing (Fallback for complex/vague cases)
        setProcessingStatus(confidence === 'low' ? "Verifying with AI..." : "Analyzing with AI...");

        try {
            const { data, error } = await supabase.functions.invoke('parse-travel-document', {
                body: { text: textToAnalyze, homeCountry }
            });

            if (error) throw error;

            if (data && data.trips && data.trips.length > 0) {
                const primaryTrip = data.trips[0];

                // Map AI response to our app format
                let aiCountryCode = "XX";
                const matchedCountry = allCountries.find(c => c.name.toLowerCase() === primaryTrip.destination_country.toLowerCase());
                if (matchedCountry) {
                    aiCountryCode = matchedCountry.code;
                }

                const parsedData: ParsedTravelData = {
                    country: primaryTrip.destination_country,
                    countryCode: aiCountryCode,
                    city: primaryTrip.destination_city,
                    startDate: primaryTrip.start_date,
                    endDate: primaryTrip.end_date,
                    tripName: primaryTrip.trip_name,
                    source: 'flight',
                    isDomestic: homeCountry ? (primaryTrip.destination_country.toLowerCase() === homeCountry.toLowerCase()) : false
                };

                handleSuccess(parsedData);
                return;
            } else {
                throw new Error("AI did not find trip data");
            }

        } catch (aiError) {
            console.warn("AI parsing failed or unavailable, falling back to local regex:", aiError);

            // STEP 3: Final Fallback
            // If we had a 'low' confidence local match, use it now as a last resort
            if (localData) {
                toast({
                    title: "AI Analysis Failed",
                    description: "Falling back to local scan. Please verify details.",
                    variant: "destructive",
                    duration: 4000,
                });
                handleSuccess(localData);
            } else {
                toast({
                    title: "Import Failed",
                    description: "Could not parse document via AI or local scan.",
                    variant: "destructive",
                    duration: 5000,
                });
            }
        } finally {
            setLoading(false);
            setProcessingStatus("");
        }
    };

    const handleYearConfirm = () => {
        if (pendingParsedData && manualYear) {
            const year = parseInt(manualYear) || new Date().getFullYear();
            const replaceYear = (dateStr: string | null) => {
                if (!dateStr) return null;
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    // Replace the year part (index 0)
                    return `${year}-${parts[1]}-${parts[2]}`;
                }
                return dateStr;
            };

            const updatedData: ParsedTravelData = {
                ...pendingParsedData,
                startDate: replaceYear(pendingParsedData.startDate),
                endDate: replaceYear(pendingParsedData.endDate),
                missingYear: false // Resolved
            };

            // Reset state
            setPendingParsedData(null);
            setShowYearInput(false);

            // Proceed
            handleSuccess(updatedData);
        }
    };

    const handleSuccess = async (parsedData: ParsedTravelData) => {
        // If missing year, pause and ask user
        if (parsedData.missingYear && !showYearInput) {
            setPendingParsedData(parsedData);
            setShowYearInput(true);
            return;
        }

        let isDuplicate = false;

        // Check for duplicates
        if (parsedData.country && parsedData.startDate && parsedData.endDate) {
            try {
                const { data: existingCountry } = await supabase
                    .from('countries')
                    .select('id')
                    .ilike('name', parsedData.country)
                    .maybeSingle();

                if (existingCountry) {
                    const { data: duplicates } = await supabase
                        .from('country_visit_details')
                        .select('id')
                        .eq('country_id', existingCountry.id)
                        .eq('visit_date', parsedData.startDate)
                        .eq('end_date', parsedData.endDate);

                    if (duplicates && duplicates.length > 0) {
                        isDuplicate = true;
                    }
                }
            } catch (err) {
                console.error("Error checking for duplicates:", err);
            }
        }

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

        if (onCountryDetected) {
            const dateInfo = parsedData.startDate
                ? (parsedData.endDate
                    ? ` from ${parsedData.startDate} to ${parsedData.endDate}`
                    : ` on ${parsedData.startDate}`)
                : '';

            if (isDuplicate) {
                toast({
                    title: "Duplicate Trip Detected",
                    description: `A trip to ${parsedData.country} with these exact dates already exists. please review details.`,
                    duration: 6000,
                    variant: "default",
                });
            } else {
                toast({
                    title: "Trip Detected!",
                    description: `${parsedData.city ? parsedData.city + ', ' : ''}${parsedData.country}${dateInfo}`,
                    duration: 5000,
                });
            }

            setOpen(false);
            setPasteContent("");
            setFiles([]);
            setPendingParsedData(null);
            setShowYearInput(false);
            onCountryDetected({ ...parsedData, isDuplicate });
        }
    };

    const parseLocally = (text: string): ParsedTravelData | null => {
        const detectedAirports = extractAirportCodes(text);
        let parsedData: ParsedTravelData | null = null;

        if (detectedAirports.length >= 2) {
            const uniqueAirports = [...new Set(detectedAirports)];
            let arrivalCode = uniqueAirports[uniqueAirports.length - 1];
            let departureCode = uniqueAirports[0];

            if (homeCountry) {
                const international = uniqueAirports.find(code => {
                    const info = getAirportInfo(code);
                    return info && info.country.toLowerCase() !== homeCountry.toLowerCase();
                });
                if (international) {
                    arrivalCode = international;
                    departureCode = uniqueAirports[0] === international ? (uniqueAirports[1] || uniqueAirports[0]) : uniqueAirports[0];
                }
            }

            if (departureCode !== arrivalCode) {
                const arrivalInfo = getAirportInfo(arrivalCode);
                if (arrivalInfo) {
                    const dates = extractDates(text);
                    parsedData = {
                        country: arrivalInfo.country,
                        countryCode: arrivalInfo.countryCode,
                        city: arrivalInfo.city,
                        startDate: dates.startDate,
                        endDate: dates.endDate,
                        tripName: `Trip to ${arrivalInfo.city}`,
                        source: 'flight',
                        missingYear: dates.missingYear,
                        isDomestic: isSameCountry(departureCode, arrivalCode),
                    };
                }
            }
        }

        if (!parsedData) {
            const countryInfo = findCountryInText(text);
            if (countryInfo) {
                const dates = extractDates(text);
                const placeName = extractPlaceName(text);
                parsedData = {
                    country: countryInfo.country,
                    countryCode: countryInfo.code,
                    city: countryInfo.city,
                    startDate: dates.startDate,
                    endDate: dates.endDate,
                    tripName: placeName ? `Stay at ${placeName}` : `Trip to ${countryInfo.city || countryInfo.country}`,
                    source: 'hotel',
                    missingYear: dates.missingYear,
                    isDomestic: false,
                };
            }
        }
        return parsedData;
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
                        Paste text from boarding passes or hotel reservations. We'll verify it with AI.
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
                    {showYearInput ? (
                        <div className="bg-muted p-4 rounded-md space-y-4">
                            <div className="flex items-center gap-2 text-amber-600">
                                <Calendar className="h-5 w-5" />
                                <h4 className="font-semibold text-sm">Valid Year Required</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                We detected dates from your text, but the year was missing.
                                Please confirm which year this trip coincides with:
                            </p>
                            <div className="flex gap-2 items-end">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="year">Trip Year</Label>
                                    <Input
                                        type="number"
                                        id="year"
                                        value={manualYear}
                                        onChange={(e) => setManualYear(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleYearConfirm}>Confirm Year</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {loading && (
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{processingStatus}</span>
                                </div>
                            )}
                            <Button onClick={processContent} disabled={loading} className="w-full">
                                {loading ? "Analyzing..." : "Detect Country"}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Re-export for backwards compatibility (renamed type)
export type ParsedFlightData = ParsedTravelData;
