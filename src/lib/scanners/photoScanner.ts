
import { ScannedPhoto } from "./types";
import { MOCK_PHOTOS } from "./mockData";

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class PhotoScanner {
    // In a real implementation, this would access device photos
    // For web demo, we return mock data

    async scanPhotos(onProgress?: (count: number) => void): Promise<ScannedPhoto[]> {
        // Simulate finding photos one by one
        const results: ScannedPhoto[] = [];
        const total = MOCK_PHOTOS.length;

        for (let i = 0; i < total; i++) {
            await delay(300); // Simulate processing time
            results.push(MOCK_PHOTOS[i]);
            if (onProgress) {
                onProgress(i + 1);
            }
        }

        return results;
    }

    // Group photos by location/date essentially happens in the suggestion engine
    // But here we might filter out home country photos
    filterForeignPhotos(photos: ScannedPhoto[], homeCountryCode: string): ScannedPhoto[] {
        return photos.filter(p =>
            p.countryCode &&
            p.countryCode.toUpperCase() !== homeCountryCode.toUpperCase()
        );
    }
}

export const photoScanner = new PhotoScanner();
