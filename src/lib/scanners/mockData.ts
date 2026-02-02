
import { ScannedPhoto, ScannedEmail } from "./types";

export const MOCK_PHOTOS: ScannedPhoto[] = [
    // Japan Trip (March 2024)
    {
        id: "photo_jp_1",
        fileName: "IMG_20240328_102345.jpg",
        dateTaken: new Date("2024-03-28T10:23:45"),
        latitude: 35.6895,
        longitude: 139.6917,
        countryCode: "JP",
        countryName: "Japan"
    },
    {
        id: "photo_jp_2",
        fileName: "IMG_20240329_141520.jpg",
        dateTaken: new Date("2024-03-29T14:15:20"),
        latitude: 34.6937,
        longitude: 135.5023,
        countryCode: "JP",
        countryName: "Japan"
    },
    {
        id: "photo_jp_3",
        fileName: "IMG_20240402_093010.jpg",
        dateTaken: new Date("2024-04-02T09:30:10"),
        latitude: 35.0116,
        longitude: 135.7681,
        countryCode: "JP",
        countryName: "Japan"
    },

    // France Trip (June 2024)
    {
        id: "photo_fr_1",
        fileName: "IMG_20240615_184500.jpg",
        dateTaken: new Date("2024-06-15T18:45:00"),
        latitude: 48.8566,
        longitude: 2.3522,
        countryCode: "FR",
        countryName: "France"
    },
    {
        id: "photo_fr_2",
        fileName: "IMG_20240616_112000.jpg",
        dateTaken: new Date("2024-06-16T11:20:00"),
        latitude: 48.8049,
        longitude: 2.1204,
        countryCode: "FR",
        countryName: "France"
    },

    // Jamaica Trip (Dec 2023)
    {
        id: "photo_jm_1",
        fileName: "IMG_20231225_120000.jpg",
        dateTaken: new Date("2023-12-25T12:00:00"),
        latitude: 18.4207,
        longitude: -77.9352,
        countryCode: "JM",
        countryName: "Jamaica"
    }
];

export const MOCK_EMAILS: ScannedEmail[] = [
    // Japan Flight
    {
        id: "email_jp_1",
        subject: "Flight Confirmation: Tokyo",
        snippet: "Your flight to Tokyo (HND) departs on March 27, 2024. Confirmation #XYZ123.",
        date: new Date("2024-01-15T10:00:00"),
        extractedCountry: "Japan",
        extractedCountryCode: "JP",
        extractedDate: new Date("2024-03-27"),
        type: "flight",
        confidence: 0.95
    },

    // France Hotel
    {
        id: "email_fr_1",
        subject: "Booking.com: Your stay in Paris",
        snippet: "Confirmed reservation at Hotel Lumiere, Paris from June 15-22, 2024.",
        date: new Date("2024-05-10T14:30:00"),
        extractedCountry: "France",
        extractedCountryCode: "FR",
        extractedDate: new Date("2024-06-15"),
        type: "hotel",
        confidence: 0.9
    },

    // Mexico Trip (Email only example)
    {
        id: "email_mx_1",
        subject: "Flight to Cancun",
        snippet: "Your trip to Cancun is coming up! Depart: Dec 20, 2023.",
        date: new Date("2023-11-05T09:15:00"),
        extractedCountry: "Mexico",
        extractedCountryCode: "MX",
        extractedDate: new Date("2023-12-20"),
        type: "flight",
        confidence: 0.85
    }
];
