import { parse, parseISO, isValid } from "date-fns";
import { getAllCountries, searchCountries } from "@/lib/countriesData";

export interface TripSuggestion {
  id: string;
  countryName: string;
  countryCode?: string;
  visitDate: string | null;
  endDate: string | null;
  approximateMonth: number | null;
  approximateYear: number | null;
  tripName: string | null;
  sourceType: "pasted_text" | "photo_exif";
  sourceLabel: string;
  photoCount?: number;
  photoFileNames?: string[];
}

const DATE_PATTERNS: { pattern: RegExp; parseFn: (match: RegExpMatchArray) => { visit: string | null; end: string | null; approxMonth: number | null; approxYear: number | null } }[] = [
  // 3/25/13 to 3/30/13 or 3/25/13 - 3/30/13
  {
    pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:to|-)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,
    parseFn(m) {
      const y1 = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
      const y2 = m[6].length === 2 ? 2000 + parseInt(m[6], 10) : parseInt(m[6], 10);
      const visit = `${y1}-${String(parseInt(m[1], 10)).padStart(2, "0")}-${String(parseInt(m[2], 10)).padStart(2, "0")}`;
      const end = `${y2}-${String(parseInt(m[4], 10)).padStart(2, "0")}-${String(parseInt(m[5], 10)).padStart(2, "0")}`;
      try {
        const d1 = parse(visit, "yyyy-MM-dd", new Date());
        const d2 = parse(end, "yyyy-MM-dd", new Date());
        if (isValid(d1) && isValid(d2)) return { visit, end, approxMonth: null, approxYear: null };
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // Mar 25, 2013 - Mar 30, 2013
  {
    pattern: /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})\s*(?:to|-)\s*([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/i,
    parseFn(m) {
      try {
        const d1 = parse(`${m[1]} ${m[2]}, ${m[3]}`, "MMM d, yyyy", new Date());
        const d2 = parse(`${m[4]} ${m[5]}, ${m[6]}`, "MMM d, yyyy", new Date());
        if (isValid(d1) && isValid(d2)) {
          const visit = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
          const end = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
          return { visit, end, approxMonth: null, approxYear: null };
        }
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // 2013-03-25 to 2013-03-30
  {
    pattern: /(\d{4})-(\d{2})-(\d{2})\s*(?:to|-)\s*(\d{4})-(\d{2})-(\d{2})/gi,
    parseFn(m) {
      const visit = `${m[1]}-${m[2]}-${m[3]}`;
      const end = `${m[4]}-${m[5]}-${m[6]}`;
      try {
        const d1 = parseISO(visit);
        const d2 = parseISO(end);
        if (isValid(d1) && isValid(d2)) return { visit, end, approxMonth: null, approxYear: null };
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
  // 25.03.2013 - 30.03.2013
  {
    pattern: /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(?:to|-)\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
    parseFn(m) {
      const visit = `${m[3]}-${String(parseInt(m[2], 10)).padStart(2, "0")}-${String(parseInt(m[1], 10)).padStart(2, "0")}`;
      const end = `${m[6]}-${String(parseInt(m[5], 10)).padStart(2, "0")}-${String(parseInt(m[4], 10)).padStart(2, "0")}`;
      try {
        const d1 = parseISO(visit);
        const d2 = parseISO(end);
        if (isValid(d1) && isValid(d2)) return { visit, end, approxMonth: null, approxYear: null };
      } catch {}
      return { visit: null, end: null, approxMonth: null, approxYear: null };
    },
  },
];

// Single date or approximate (e.g. "March 2013", "2013")
function parseSingleDateOrApprox(text: string): { visit: string | null; end: string | null; approxMonth: number | null; approxYear: number | null } {
  // Month Year: March 2013, Mar 2013
  const monthYear = text.match(/([A-Za-z]{3,9})\s+(\d{4})/i);
  if (monthYear) {
    try {
      const d = parse(`${monthYear[1]} 1, ${monthYear[2]}`, "MMM d, yyyy", new Date());
      if (isValid(d)) {
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const lastDay = new Date(year, month, 0).getDate();
        const visit = `${year}-${String(month).padStart(2, "0")}-01`;
        const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        return { visit, end, approxMonth: month, approxYear: year };
      }
    } catch {}
  }
  // Year only
  const yearOnly = text.match(/\b(19|20)\d{2}\b/);
  if (yearOnly) {
    const y = parseInt(yearOnly[0], 10);
    return { visit: null, end: null, approxMonth: null, approxYear: y };
  }
  return { visit: null, end: null, approxMonth: null, approxYear: null };
}

const allCountries = getAllCountries();

function findCountryInText(text: string): { name: string; code: string } | null {
  const lower = text.toLowerCase();
  // Check exact name and aliases via search
  for (const c of allCountries) {
    if (lower.includes(c.name.toLowerCase())) return { name: c.name, code: c.code };
    const aliases: Record<string, string[]> = {
      GB: ["uk", "britain", "great britain", "united kingdom"],
      US: ["usa", "america", "united states of america", "united states"],
    };
    const list = aliases[c.code] ?? [];
    for (const a of list) {
      if (lower.includes(a)) return { name: c.name, code: c.code };
    }
  }
  const words = text.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[,.]/g, "");
    const found = searchCountries(cleaned)[0];
    if (found) return { name: found.name, code: found.code };
  }
  return null;
}

/**
 * Extract trip suggestions from pasted text (OOO, boarding pass, etc.).
 * One suggestion per (country, date range); multiple ranges for same country => multiple suggestions.
 */
export function parsePastedText(text: string): TripSuggestion[] {
  if (!text?.trim()) return [];
  const results: TripSuggestion[] = [];
  const country = findCountryInText(text);
  if (!country) return [];

  let visitDate: string | null = null;
  let endDate: string | null = null;
  let approximateMonth: number | null = null;
  let approximateYear: number | null = null;

  for (const { pattern, parseFn } of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const parsed = parseFn(m);
      if (parsed.visit || parsed.approxYear != null) {
        visitDate = parsed.visit;
        endDate = parsed.end;
        approximateMonth = parsed.approxMonth;
        approximateYear = parsed.approxYear;
        break;
      }
    }
  }
  if (visitDate === null && endDate === null && approximateYear === null) {
    const single = parseSingleDateOrApprox(text);
    visitDate = single.visit;
    endDate = single.end;
    approximateMonth = single.approxMonth;
    approximateYear = single.approxYear;
  }

  const id = `paste_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  results.push({
    id,
    countryName: country.name,
    countryCode: country.code,
    visitDate,
    endDate,
    approximateMonth,
    approximateYear,
    tripName: null,
    sourceType: "pasted_text",
    sourceLabel: "From pasted text",
  });
  return results;
}
