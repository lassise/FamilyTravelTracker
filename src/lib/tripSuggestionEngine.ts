
import { ScannedPhoto, ScannedEmail, TripSuggestion } from "./scanners/types";
import { format, differenceInDays, parseISO, addDays, min, max } from "date-fns";

export class TripSuggestionEngine {

    generateSuggestions(
        photos: ScannedPhoto[],
        emails: ScannedEmail[]
    ): TripSuggestion[] {

        const suggestions: TripSuggestion[] = [];

        // 1. Group items by Country
        const itemsByCountry = new Map<string, { photos: ScannedPhoto[], emails: ScannedEmail[] }>();

        // Process photos
        photos.forEach(p => {
            if (!p.countryCode || !p.countryName) return;
            const key = p.countryCode;
            if (!itemsByCountry.has(key)) {
                itemsByCountry.set(key, { photos: [], emails: [] });
            }
            itemsByCountry.get(key)!.photos.push(p);
        });

        // Process emails
        emails.forEach(e => {
            if (!e.extractedCountryCode) return;
            const key = e.extractedCountryCode;
            if (!itemsByCountry.has(key)) {
                itemsByCountry.set(key, { photos: [], emails: [] });
            }
            itemsByCountry.get(key)!.emails.push(e);
        });

        // 2. Cluster by Date within each country
        itemsByCountry.forEach((data, countryCode) => {
            const clusters = this.clusterByDate(data.photos, data.emails);

            clusters.forEach(cluster => {
                if (cluster.photos.length === 0 && cluster.emails.length === 0) return;

                const countryName = cluster.photos[0]?.countryName || cluster.emails[0]?.extractedCountry || "Unknown Country";

                // Calculate start/end dates
                const allDates = [
                    ...cluster.photos.map(p => p.dateTaken),
                    ...cluster.emails.map(e => e.extractedDate || e.date)
                ].sort((a, b) => a.getTime() - b.getTime());

                const startDate = allDates[0];
                const endDate = allDates[allDates.length - 1];

                // Generate ID
                const id = `trip_${countryCode}_${startDate.getTime()}`;

                // Determine confidence
                // More evidence = higher confidence
                const confidence = this.calculateConfidence(cluster.photos, cluster.emails);

                // Create suggestion
                suggestions.push({
                    id,
                    countryName,
                    countryCode,
                    visitDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                    approximateMonth: null,
                    approximateYear: null,
                    tripName: `Trip to ${countryName}`,
                    sourceType: cluster.photos.length > 0 ? "photo_exif" : "email",
                    sourceLabel: this.generateSourceLabel(cluster.photos, cluster.emails),
                    photoCount: cluster.photos.length,
                    photoFileNames: cluster.photos.map(p => p.fileName),
                    confidence
                });
            });
        });

        return suggestions.sort((a, b) => (b.visitDate || "").localeCompare(a.visitDate || ""));
    }

    // Simple clustering: group items that are within X days of each other
    private clusterByDate(photos: ScannedPhoto[], emails: ScannedEmail[]): { photos: ScannedPhoto[], emails: ScannedEmail[] }[] {
        const allItems = [
            ...photos.map(p => ({ type: 'photo' as const, date: p.dateTaken, item: p })),
            ...emails.map(e => ({ type: 'email' as const, date: e.extractedDate || e.date, item: e }))
        ].sort((a, b) => a.date.getTime() - b.date.getTime());

        const clusters: { photos: ScannedPhoto[], emails: ScannedEmail[] }[] = [];

        if (allItems.length === 0) return clusters;

        let currentCluster: { photos: ScannedPhoto[], emails: ScannedEmail[] } = { photos: [], emails: [] };
        let lastDate = allItems[0].date;

        allItems.forEach((entry) => {
            // If gap > 14 days, start new cluster
            // 14 days is arbitrary, but covers most "separate trips" to same country close together
            if (differenceInDays(entry.date, lastDate) > 14) {
                clusters.push(currentCluster);
                currentCluster = { photos: [], emails: [] };
            }

            if (entry.type === 'photo') {
                currentCluster.photos.push(entry.item as ScannedPhoto);
            } else {
                currentCluster.emails.push(entry.item as ScannedEmail);
            }
            lastDate = entry.date;
        });

        if (currentCluster.photos.length > 0 || currentCluster.emails.length > 0) {
            clusters.push(currentCluster);
        }

        return clusters;
    }

    private calculateConfidence(photos: ScannedPhoto[], emails: ScannedEmail[]): number {
        let score = 0.5; // Base confidence

        // Photos add significant confidence
        if (photos.length > 0) score += 0.2;
        if (photos.length > 5) score += 0.1;
        if (photos.length > 20) score += 0.1;

        // Emails add confidence
        if (emails.length > 0) score += 0.2;
        if (emails.some(e => e.type === 'flight')) score += 0.1; // Flight confirmation is strong signal

        return Math.min(0.99, score);
    }

    private generateSourceLabel(photos: ScannedPhoto[], emails: ScannedEmail[]): string {
        const parts: string[] = [];
        if (photos.length > 0) {
            parts.push(`${photos.length} photo${photos.length === 1 ? '' : 's'}`);
        }
        if (emails.length > 0) {
            parts.push(`${emails.length} email${emails.length === 1 ? '' : 's'}`);
        }

        if (parts.length === 0) return "Unknown source";
        return "From " + parts.join(" and ");
    }
}

export const tripSuggestionEngine = new TripSuggestionEngine();
