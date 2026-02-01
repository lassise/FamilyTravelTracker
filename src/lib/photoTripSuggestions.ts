import exifr from "exifr";
import { format, parseISO, isValid } from "date-fns";
import { getAllCountries } from "@/lib/countriesData";
import type { TripSuggestion } from "@/lib/tripSuggestionsParser";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";
const REQUEST_DELAY_MS = 1100; // Nominatim: 1 req/sec

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface NominatimResult {
  address?: { country_code?: string; country?: string };
}

async function reverseGeocode(lat: number, lon: number): Promise<{ countryCode: string; countryName: string } | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lon),
    addressdetails: "1",
  });
  const url = `${NOMINATIM_BASE}?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: NominatimResult = await res.json();
    const code = data.address?.country_code?.toUpperCase();
    const name = data.address?.country;
    if (!code || !name) return null;
    const all = getAllCountries();
    const match = all.find((c) => c.code.toUpperCase() === code);
    return { countryCode: code, countryName: match?.name ?? name };
  } catch {
    return null;
  }
}

function formatDateFromExif(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  try {
    const s = String(value).replace(/\s/g, " ");
    const d = parseISO(s);
    if (isValid(d)) return format(d, "yyyy-MM-dd");
    const d2 = new Date(s);
    if (!isNaN(d2.getTime())) return format(d2, "yyyy-MM-dd");
  } catch {}
  return null;
}

export async function getSuggestionsFromPhotos(
  files: File[],
  homeCountryIso2: string | null
): Promise<TripSuggestion[]> {
  const allCountries = getAllCountries();
  const byKey: Record<string, { countryCode: string; countryName: string; dates: string[]; fileNames: string[] }> = {};

  for (let i = 0; i < files.length; i++) {
    const photoFile = files[i];
    try {
      const [gps, exifData] = await Promise.all([
        exifr.gps(photoFile).catch(() => null),
        exifr.parse(photoFile).catch(() => null),
      ]);
      if (!gps?.latitude || !gps?.longitude) continue;

      await delay(i > 0 ? REQUEST_DELAY_MS : 0);
      const geo = await reverseGeocode(gps.latitude, gps.longitude);
      if (!geo) continue;
      if (homeCountryIso2 && geo.countryCode.toUpperCase() === homeCountryIso2.toUpperCase()) continue;

      let dateStr: string | null = null;
      if (exifData?.DateTimeOriginal) dateStr = formatDateFromExif(exifData.DateTimeOriginal);
      else if (exifData?.CreateDate) dateStr = formatDateFromExif(exifData.CreateDate);
      else if (exifData?.ModifyDate) dateStr = formatDateFromExif(exifData.ModifyDate);
      if (!dateStr) dateStr = null;

      const monthYear = dateStr ? dateStr.slice(0, 7) : "unknown";
      const key = `${geo.countryCode}|${monthYear}`;
      if (!byKey[key]) {
        byKey[key] = { countryCode: geo.countryCode, countryName: geo.countryName, dates: [], fileNames: [] };
      }
      byKey[key].fileNames.push(photoFile.name);
      if (dateStr) byKey[key].dates.push(dateStr);
    } catch {
      // skip file on error
    }
  }

  const results: TripSuggestion[] = [];
  let idx = 0;
  for (const key of Object.keys(byKey)) {
    const row = byKey[key];
    const dates = row.dates.filter(Boolean).sort();
    const visitDate = dates.length > 0 ? dates[0] : null;
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null;
    const photoCount = row.fileNames.length;
    const sourceLabel =
      photoCount > 1
        ? `From ${photoCount} photos in ${row.countryName}`
        : `From photo ${row.fileNames[0] ?? ""}`;
    results.push({
      id: `photo_${Date.now()}_${idx}`,
      countryName: row.countryName,
      countryCode: row.countryCode,
      visitDate,
      endDate,
      approximateMonth: null,
      approximateYear: null,
      tripName: null,
      sourceType: "photo_exif",
      sourceLabel,
      photoCount,
      photoFileNames: row.fileNames,
    });
    idx++;
  }
  return results;
}
