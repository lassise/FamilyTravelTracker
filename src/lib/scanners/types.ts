
import { TripSuggestion } from "@/lib/tripSuggestionsParser";

export interface ScannedPhoto {
    id: string;
    fileName: string;
    dateTaken: Date;
    latitude: number;
    longitude: number;
    countryCode: string | null;
    countryName: string | null;
}

export interface ScannedEmail {
    id: string;
    subject: string;
    snippet: string;
    date: Date;
    extractedCountry?: string; // Country name
    extractedCountryCode?: string;
    extractedDate?: Date;
    type: 'flight' | 'hotel' | 'other';
    confidence: number;
}

export interface ScanResult {
    photos: ScannedPhoto[];
    emails: ScannedEmail[];
}

export type { TripSuggestion };
