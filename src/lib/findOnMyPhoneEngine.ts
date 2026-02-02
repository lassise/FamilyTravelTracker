import { addMinutes, differenceInDays, format, isValid, parseISO } from "date-fns";
import { getAllCountries } from "@/lib/countriesData";
import { parseEmailContent } from "@/lib/emailTripParser";
import type { TripSuggestion, TripSuggestionEvidenceEmail, TripSuggestionEvidencePhoto } from "@/lib/tripSuggestionsParser";

const CACHE_KEY = "find_on_my_phone_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_TRIP_DAYS = 30;
const MAX_GAP_DAYS = 2;

const allCountries = getAllCountries();

export interface FindOnMyPhoneProgress {
  step: "permissions" | "photos" | "emails" | "combine" | "complete";
  percent: number;
  message: string;
}

export interface FindOnMyPhoneOptions {
  includePhotos: boolean;
  includeEmails: boolean;
  excludeAlbums: string[];
  excludeEmailFolders: string[];
  homeCountryIso2: string | null;
  onProgress?: (progress: FindOnMyPhoneProgress) => void;
}

export interface FindOnMyPhoneResult {
  suggestions: TripSuggestion[];
  summary: {
    photosScanned: number;
    emailsScanned: number;
    tripsSuggested: number;
  };
}

interface DemoPhotoAsset {
  id: string;
  takenAt: string;
  timezoneOffsetMinutes: number;
  latitude: number | null;
  longitude: number | null;
  album: string;
  thumbnailUrl: string;
}

interface DemoEmailMessage {
  id: string;
  folder: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
}

const DEMO_ALBUMS = ["All Photos", "Family Trips", "Receipts", "Screenshots", "Work Travel"];
const DEMO_FOLDERS = ["Inbox", "Travel", "Receipts", "Newsletters"];

const demoPhotos: DemoPhotoAsset[] = [
  {
    id: "photo_paris_1",
    takenAt: "2024-06-16T09:15:00Z",
    timezoneOffsetMinutes: 120,
    latitude: 48.8584,
    longitude: 2.2945,
    album: "Family Trips",
    thumbnailUrl: "/placeholder.svg",
  },
  {
    id: "photo_paris_2",
    takenAt: "2024-06-19T18:45:00Z",
    timezoneOffsetMinutes: 120,
    latitude: 48.8566,
    longitude: 2.3522,
    album: "Family Trips",
    thumbnailUrl: "/placeholder.svg",
  },
  {
    id: "photo_london_1",
    takenAt: "2023-10-03T12:05:00Z",
    timezoneOffsetMinutes: 60,
    latitude: 51.5074,
    longitude: -0.1278,
    album: "Work Travel",
    thumbnailUrl: "/placeholder.svg",
  },
  {
    id: "photo_tokyo_1",
    takenAt: "2024-03-30T03:15:00Z",
    timezoneOffsetMinutes: 540,
    latitude: 35.6762,
    longitude: 139.6503,
    album: "Family Trips",
    thumbnailUrl: "/placeholder.svg",
  },
  {
    id: "photo_tokyo_2",
    takenAt: "2024-04-05T15:45:00Z",
    timezoneOffsetMinutes: 540,
    latitude: 35.6895,
    longitude: 139.6917,
    album: "Family Trips",
    thumbnailUrl: "/placeholder.svg",
  },
  {
    id: "photo_layover_1",
    takenAt: "2024-02-10T07:15:00Z",
    timezoneOffsetMinutes: 0,
    latitude: 64.1466,
    longitude: -21.9426,
    album: "Receipts",
    thumbnailUrl: "/placeholder.svg",
  },
  {
    id: "photo_home_1",
    takenAt: "2024-01-05T10:30:00Z",
    timezoneOffsetMinutes: -300,
    latitude: 40.7128,
    longitude: -74.006,
    album: "All Photos",
    thumbnailUrl: "/placeholder.svg",
  },
];

const demoEmails: DemoEmailMessage[] = [
  {
    id: "email_1",
    folder: "Travel",
    subject: "Your boarding pass for JL002 Tokyo",
    snippet: "Boarding pass confirmation: LAX → HND on Mar 29, 2024",
    body: "Boarding pass JL002 LAX → HND. Departure Mar 29, 2024 at 10:30 AM.",
    receivedAt: "2024-03-10T08:00:00Z",
  },
  {
    id: "email_2",
    folder: "Inbox",
    subject: "Booking.com reservation in Paris, France",
    snippet: "Check-in June 16, 2024, check-out June 22, 2024.",
    body: "Booking.com reservation in Paris, France. Check-in: June 16, 2024. Check-out: June 22, 2024.",
    receivedAt: "2024-05-01T15:00:00Z",
  },
  {
    id: "email_3",
    folder: "Receipts",
    subject: "Expedia itinerary to Mexico",
    snippet: "Your trip to Mexico from Dec 20, 2023 to Dec 28, 2023.",
    body: "Expedia trip to Mexico. Dates: Dec 20, 2023 - Dec 28, 2023.",
    receivedAt: "2023-11-01T11:00:00Z",
  },
  {
    id: "email_4",
    folder: "Newsletters",
    subject: "Traveling to Portugal this spring?",
    snippet: "Look at flights to Lisbon for April 2024.",
    body: "Thinking about traveling to Portugal on April 2024? See deals.",
    receivedAt: "2024-02-05T12:00:00Z",
  },
];

const demoGeofence = [
  { code: "FR", name: "France", lat: [48, 49], lon: [2, 3] },
  { code: "GB", name: "United Kingdom", lat: [51, 52], lon: [-1, 1] },
  { code: "JP", name: "Japan", lat: [35, 36], lon: [139, 140] },
  { code: "IS", name: "Iceland", lat: [64, 65], lon: [-23, -20] },
  { code: "US", name: "United States", lat: [39, 41], lon: [-75, -73] },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockReverseGeocode(latitude: number | null, longitude: number | null): { code: string; name: string } | null {
  if (latitude == null || longitude == null) return null;
  const match = demoGeofence.find(
    (entry) =>
      latitude >= entry.lat[0] &&
      latitude <= entry.lat[1] &&
      longitude >= entry.lon[0] &&
      longitude <= entry.lon[1]
  );
  if (match) return { code: match.code, name: match.name };
  return null;
}

function normalizePhotoDate(takenAt: string, offsetMinutes: number): string | null {
  try {
    const parsed = parseISO(takenAt);
    if (!isValid(parsed)) return null;
    const local = addMinutes(parsed, offsetMinutes);
    return format(local, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function isHomeCountry(countryCode: string, homeCountryIso2: string | null): boolean {
  if (!homeCountryIso2) return false;
  return countryCode.toUpperCase() === homeCountryIso2.toUpperCase();
}

function calculateConfidence(photos: TripSuggestionEvidencePhoto[], emails: TripSuggestionEvidenceEmail[]): number {
  let score = 0.35;
  if (photos.length > 0) score += 0.3;
  if (emails.length > 0) score += 0.25;
  if (photos.length > 0 && emails.length > 0) score += 0.1;
  if (photos.length >= 5) score += 0.05;
  if (emails.length >= 2) score += 0.05;
  const isTransitOnly = photos.every((p) => p.isTransit) && emails.length === 0;
  if (isTransitOnly) score -= 0.15;
  return Math.min(Math.max(score, 0.15), 0.98);
}

function groupEvidenceByDate<T extends { date: string | null }>(
  items: T[],
  maxGapDays = MAX_GAP_DAYS,
  maxTripDays = MAX_TRIP_DAYS
): Array<{ startDate: string | null; endDate: string | null; items: T[] }> {
  const dated = items.filter((item) => item.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (dated.length === 0) return [];
  const groups: Array<{ startDate: string | null; endDate: string | null; items: T[] }> = [];
  let current = { startDate: dated[0].date, endDate: dated[0].date, items: [dated[0]] };

  for (let i = 1; i < dated.length; i++) {
    const next = dated[i];
    const currentEnd = current.endDate ? parseISO(current.endDate) : null;
    const nextDate = next.date ? parseISO(next.date) : null;
    if (!currentEnd || !nextDate || !isValid(currentEnd) || !isValid(nextDate)) {
      current.items.push(next);
      continue;
    }
    const gap = differenceInDays(nextDate, currentEnd);
    const startDateValue = current.startDate ?? next.date;
    if (!startDateValue) {
      current.items.push(next);
      continue;
    }
    const span = differenceInDays(nextDate, parseISO(startDateValue));
    if (gap <= maxGapDays && span <= maxTripDays) {
      current.endDate = next.date;
      current.items.push(next);
    } else {
      groups.push(current);
      current = { startDate: next.date, endDate: next.date, items: [next] };
    }
  }
  groups.push(current);
  return groups;
}

function attachMultiCountryClusters(suggestions: TripSuggestion[]): TripSuggestion[] {
  const clustered = suggestions.map((s) => ({ ...s }));
  for (let i = 0; i < clustered.length; i++) {
    const a = clustered[i];
    if (!a.visitDate || !a.endDate) continue;
    const related: string[] = [];
    for (let j = 0; j < clustered.length; j++) {
      if (i === j) continue;
      const b = clustered[j];
      if (!b.visitDate || !b.endDate) continue;
      const overlap =
        parseISO(a.visitDate) <= parseISO(b.endDate) &&
        parseISO(b.visitDate) <= parseISO(a.endDate);
      const near = Math.abs(differenceInDays(parseISO(a.visitDate), parseISO(b.endDate))) <= 1;
      if (overlap || near) {
        related.push(b.countryName);
      }
    }
    if (related.length > 0) {
      a.relatedCountries = Array.from(new Set(related));
    }
  }
  return clustered;
}

function buildTripSuggestions(
  photosByCountry: Record<string, TripSuggestionEvidencePhoto[]>,
  emailsByCountry: Record<string, TripSuggestionEvidenceEmail[]>
): TripSuggestion[] {
  const suggestions: TripSuggestion[] = [];
  const countryCodes = new Set([...Object.keys(photosByCountry), ...Object.keys(emailsByCountry)]);

  countryCodes.forEach((countryCode) => {
    const photos = photosByCountry[countryCode] ?? [];
    const emails = emailsByCountry[countryCode] ?? [];
    const groups = groupEvidenceByDate(
      [...photos.map((p) => ({ date: p.date, source: "photo", payload: p })), ...emails.map((e) => ({ date: e.date, source: "email", payload: e }))],
      MAX_GAP_DAYS,
      MAX_TRIP_DAYS
    );

    const country = allCountries.find((c) => c.code === countryCode);
    groups.forEach((group, index) => {
      const groupPhotos = group.items.filter((i) => i.source === "photo").map((i) => i.payload as TripSuggestionEvidencePhoto);
      const groupEmails = group.items.filter((i) => i.source === "email").map((i) => i.payload as TripSuggestionEvidenceEmail);
      const photoCount = groupPhotos.length;
      const emailCount = groupEmails.length;
      const sourceLabel =
        photoCount > 0 && emailCount > 0
          ? `${photoCount} photos + ${emailCount} emails`
          : photoCount > 0
          ? `${photoCount} photos`
          : `${emailCount} emails`;
      suggestions.push({
        id: `${countryCode}_${index}_${Date.now()}`,
        countryName: country?.name ?? countryCode,
        countryCode,
        visitDate: group.startDate ?? null,
        endDate: group.endDate ?? null,
        approximateMonth: null,
        approximateYear: null,
        tripName: null,
        sourceType: photoCount > 0 ? "photo_exif" : "email",
        sourceLabel,
        photoCount: photoCount || undefined,
        emailCount: emailCount || undefined,
        confidence: calculateConfidence(groupPhotos, groupEmails),
        evidence: {
          photos: groupPhotos,
          emails: groupEmails,
        },
      });
    });
  });
  return attachMultiCountryClusters(suggestions);
}

export function getDemoScanSources(): { albums: string[]; folders: string[] } {
  return { albums: DEMO_ALBUMS, folders: DEMO_FOLDERS };
}

export function getCachedScan(options: FindOnMyPhoneOptions): FindOnMyPhoneResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; options: FindOnMyPhoneOptions; result: FindOnMyPhoneResult };
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    if (
      parsed.options.includePhotos !== options.includePhotos ||
      parsed.options.includeEmails !== options.includeEmails ||
      parsed.options.homeCountryIso2 !== options.homeCountryIso2
    ) {
      return null;
    }
    return parsed.result;
  } catch {
    return null;
  }
}

export function setCachedScan(options: FindOnMyPhoneOptions, result: FindOnMyPhoneResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), options, result }));
  } catch {
    // ignore cache errors
  }
}

export async function runFindOnMyPhoneDemoScan(options: FindOnMyPhoneOptions): Promise<FindOnMyPhoneResult> {
  options.onProgress?.({ step: "permissions", percent: 5, message: "Requesting device access…" });
  await sleep(400);

  const cached = getCachedScan(options);
  if (cached) {
    options.onProgress?.({ step: "complete", percent: 100, message: "Loaded cached scan results." });
    return cached;
  }

  const photosByCountry: Record<string, TripSuggestionEvidencePhoto[]> = {};
  const emailsByCountry: Record<string, TripSuggestionEvidenceEmail[]> = {};

  if (options.includePhotos) {
    options.onProgress?.({ step: "photos", percent: 20, message: "Scanning photos with location metadata…" });
    const filteredPhotos = demoPhotos.filter((photo) => !options.excludeAlbums.includes(photo.album));
    for (let i = 0; i < filteredPhotos.length; i++) {
      const photo = filteredPhotos[i];
      const location = mockReverseGeocode(photo.latitude, photo.longitude);
      if (!location || isHomeCountry(location.code, options.homeCountryIso2)) continue;
      const date = normalizePhotoDate(photo.takenAt, photo.timezoneOffsetMinutes);
      const photoEvidence: TripSuggestionEvidencePhoto = {
        id: photo.id,
        date,
        countryCode: location.code,
        countryName: location.name,
        album: photo.album,
        thumbnailUrl: photo.thumbnailUrl,
        isTransit: photo.album === "Receipts",
      };
      if (!photosByCountry[location.code]) photosByCountry[location.code] = [];
      photosByCountry[location.code].push(photoEvidence);
      options.onProgress?.({
        step: "photos",
        percent: 20 + Math.round(((i + 1) / filteredPhotos.length) * 30),
        message: `Scanning photos… (${i + 1}/${filteredPhotos.length})`,
      });
      await sleep(120);
    }
  }

  if (options.includeEmails) {
    options.onProgress?.({ step: "emails", percent: 55, message: "Scanning travel emails…" });
    const filteredEmails = demoEmails.filter((email) => !options.excludeEmailFolders.includes(email.folder));
    for (let i = 0; i < filteredEmails.length; i++) {
      const email = filteredEmails[i];
      const text = `${email.subject}\n${email.body}`;
      const suggestions = parseEmailContent(text);
      suggestions.forEach((suggestion) => {
        const countryCode = suggestion.countryCode;
        if (!countryCode || isHomeCountry(countryCode, options.homeCountryIso2)) return;
        const evidence: TripSuggestionEvidenceEmail = {
          id: email.id,
          date: suggestion.visitDate ?? null,
          subject: email.subject,
          snippet: email.snippet,
          folder: email.folder,
        };
        if (!emailsByCountry[countryCode]) emailsByCountry[countryCode] = [];
        emailsByCountry[countryCode].push(evidence);
      });
      options.onProgress?.({
        step: "emails",
        percent: 55 + Math.round(((i + 1) / filteredEmails.length) * 25),
        message: `Scanning emails… (${i + 1}/${filteredEmails.length})`,
      });
      await sleep(150);
    }
  }

  options.onProgress?.({ step: "combine", percent: 85, message: "Combining evidence into trips…" });
  await sleep(300);

  const suggestions = buildTripSuggestions(photosByCountry, emailsByCountry);
  const result: FindOnMyPhoneResult = {
    suggestions,
    summary: {
      photosScanned: options.includePhotos ? demoPhotos.length : 0,
      emailsScanned: options.includeEmails ? demoEmails.length : 0,
      tripsSuggested: suggestions.length,
    },
  };

  setCachedScan(options, result);
  options.onProgress?.({ step: "complete", percent: 100, message: "Scan complete!" });
  return result;
}
