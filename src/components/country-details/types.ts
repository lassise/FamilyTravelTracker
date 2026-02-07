// Shared types for CountryVisitDetailsDialog components

import { differenceInDays, parseISO, isAfter } from "date-fns";

// Calculate days between two dates (inclusive)
export const calculateDays = (startDate: string | null, endDate: string | null): number | null => {
    if (!startDate || !endDate) return null;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (isAfter(start, end)) return null;
    return differenceInDays(end, start) + 1;
};

export interface FamilyMember {
    id: string;
    name: string;
    avatar: string;
}

// Local state interface for new visits being created
export interface NewVisitDraft {
    id: string;
    tripName: string;
    isApproximate: boolean;
    approximateMonth: number | null;
    approximateYear: number | null;
    visitDate: string | null;
    endDate: string | null;
    numberOfDays: number;
    cities: string[];
    familyMemberIds: string[];
    highlight: string;
    whyItMattered: string;
}

export interface VisitDetail {
    id: string;
    country_id: string;
    visit_date: string | null;
    end_date: string | null;
    number_of_days: number;
    notes: string | null;
    trip_name: string | null;
    approximate_month?: number | null;
    approximate_year?: number | null;
    is_approximate?: boolean;
    highlight?: string | null;
    why_it_mattered?: string | null;
}

export interface CityVisit {
    id: string;
    country_id: string;
    city_name: string;
    visit_date: string | null;
    notes: string | null;
}

export interface CountryVisitDetailsDialogProps {
    countryId: string;
    countryName: string;
    countryCode: string;
    onUpdate: () => void;
    buttonLabel?: string;
    /** Pre-select these family member IDs for new visits (e.g. from quick-add country_visits). */
    initialFamilyMemberIds?: string[];
    // Optional controlled props
    open?: boolean | 'add';
    onOpenChange?: (open: boolean) => void;
}
