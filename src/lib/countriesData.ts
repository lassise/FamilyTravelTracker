import { countries, getEmojiFlag, type TCountryCode } from 'countries-list';

export interface CountryOption {
  name: string;
  flag: string;
  continent: string;
  code: string;
}

/**
 * Extract ISO2 country code from an emoji flag.
 * Emoji flags like 🇨🇴 are composed of regional indicator symbols (U+1F1E6..U+1F1FF)
 * that correspond to ASCII letters A-Z offset by 127397.
 * 
 * Examples:
 *   🇨🇴 → "CO" (Colombia)
 *   🇯🇲 → "JM" (Jamaica)
 *   🇫🇷 → "FR" (France)
 * 
 * Returns empty string if the input is not a valid emoji flag.
 */
export const emojiToCountryCode = (emoji: string): string => {
  if (!emoji || typeof emoji !== 'string') return '';

  // Get code points from the emoji
  const codePoints = [...emoji].map(char => char.codePointAt(0) ?? 0);

  // Regional indicator symbols range: U+1F1E6 (🇦) to U+1F1FF (🇿)
  const REGIONAL_A = 0x1F1E6;
  const REGIONAL_Z = 0x1F1FF;

  // Filter only regional indicator code points
  const regionalPoints = codePoints.filter(cp => cp >= REGIONAL_A && cp <= REGIONAL_Z);

  // A valid country flag has exactly 2 regional indicator symbols
  if (regionalPoints.length !== 2) return '';

  // Convert regional indicator code points back to ASCII letters (A=65)
  const code = regionalPoints
    .map(cp => String.fromCharCode(cp - REGIONAL_A + 65))
    .join('');

  return code;
};

/**
 * Comprehensive mapping from country names (and common variations) to ISO2 codes.
 * Built dynamically from the countries-list library plus manual additions for edge cases.
 */
const buildCountryNameToCodeMap = (): Map<string, string> => {
  const map = new Map<string, string>();

  // Add all countries from the library (lowercase name -> code)
  Object.entries(countries).forEach(([code, data]) => {
    map.set(data.name.toLowerCase(), code);
    // Also add without common prefixes/suffixes for fuzzy matching
    const simplified = data.name.toLowerCase()
      .replace(/^the\s+/, '')
      .replace(/\s+republic(\s+of)?$/i, '')
      .replace(/\s+islands?$/i, '');
    if (simplified !== data.name.toLowerCase()) {
      map.set(simplified, code);
    }
  });

  // Add UK nations with subdivision codes
  map.set('england', 'GB-ENG');
  map.set('scotland', 'GB-SCT');
  map.set('wales', 'GB-WLS');
  map.set('northern ireland', 'GB-NIR');

  // Common aliases and variations
  const aliases: Record<string, string> = {
    'usa': 'US',
    'america': 'US',
    'united states of america': 'US',
    'uk': 'GB',
    'britain': 'GB',
    'great britain': 'GB',
    'uae': 'AE',
    'emirates': 'AE',
    'dubai': 'AE',
    'abu dhabi': 'AE',
    'south korea': 'KR',
    'korea': 'KR',
    'czechia': 'CZ',
    'czech republic': 'CZ',
    'holland': 'NL',
    'ivory coast': 'CI',
    'democratic republic of the congo': 'CD',
    'congo': 'CG',
    'dr congo': 'CD',
    'bosnia': 'BA',
    'russia': 'RU',
    'vietnam': 'VN',
    'laos': 'LA',
    'iran': 'IR',
    'syria': 'SY',
    'north korea': 'KP',
    'taiwan': 'TW',
    'palestine': 'PS',
    'vatican': 'VA',
    'vatican city': 'VA',
    'hong kong': 'HK',
    'macau': 'MO',
    'macao': 'MO',
  };

  Object.entries(aliases).forEach(([name, code]) => {
    map.set(name.toLowerCase(), code);
  });

  return map;
};

// Cached comprehensive name-to-code map
let cachedNameToCodeMap: Map<string, string> | null = null;
const getNameToCodeMap = (): Map<string, string> => {
  if (!cachedNameToCodeMap) {
    cachedNameToCodeMap = buildCountryNameToCodeMap();
  }
  return cachedNameToCodeMap;
};

/**
 * Get ISO2 country code from a country name.
 * Uses a comprehensive mapping that includes all countries and common variations.
 */
export const getCodeFromName = (name: string): string => {
  if (!name?.trim()) return '';
  const normalized = name.trim().toLowerCase();
  return getNameToCodeMap().get(normalized) || '';
};

// Map of continent codes to full names
const continentNames: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

// Cache the country list - computed once
let cachedCountries: CountryOption[] | null = null;

// Get all countries as options (memoized)
export const getAllCountries = (): CountryOption[] => {
  if (cachedCountries) return cachedCountries;

  // Add UK nations as separate entries
  const ukNations: CountryOption[] = [
    { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', continent: 'Europe', code: 'GB-ENG' },
    { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', continent: 'Europe', code: 'GB-SCT' },  // Saltire
    { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', continent: 'Europe', code: 'GB-WLS' },
  ];

  const standardCountries = Object.entries(countries)
    .filter(([code]) => code !== 'GB')  // Remove unified UK, we're using separate nations
    .map(([code, data]) => ({
      name: data.name,
      flag: getEmojiFlag(code as TCountryCode),
      continent: continentNames[data.continent] || data.continent,
      code,
    }));

  cachedCountries = [...standardCountries, ...ukNations]
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedCountries;
};

// Country aliases for common alternative names
const countryAliases: Record<string, string[]> = {
  // UK nations first so they take precedence over the generic GB/UK mapping
  'GB-SCT': ['scotland'],
  'GB-WLS': ['wales'],
  'GB-ENG': ['england'],
  'GB-NIR': ['northern ireland'],
  'GB': ['uk', 'britain', 'great britain', 'united kingdom'],
  'US': ['usa', 'america', 'united states of america'],
  'AE': ['uae', 'emirates', 'dubai', 'abu dhabi'],
  'KR': ['south korea', 'korea'],
  'CZ': ['czechia'],
  'NL': ['holland'],
};

// Normalize a free-form location string for robust matching
const normalizeLocationString = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[,]/g, ' ')      // remove commas
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim();
};

// Get code for special regions (returns subdivision code for UK nations)
export const getRegionCode = (name: string): string => {
  if (!name) return '';
  const normalized = normalizeLocationString(name);

  // Explicit handling: if "scotland" appears anywhere, prefer the Scotland flag
  if (normalized.includes('scotland')) {
    return 'GB-SCT';
  }
  if (normalized.includes('wales')) {
    return 'GB-WLS';
  }
  if (normalized.includes('england')) {
    return 'GB-ENG';
  }
  if (normalized.includes('northern ireland')) {
    return 'GB-NIR';
  }

  // Generic alias matching (for UK, US, etc.)
  for (const [code, aliases] of Object.entries(countryAliases)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeLocationString(alias);
      if (normalized === normalizedAlias || normalized.includes(normalizedAlias)) {
        return code;
      }
    }
  }

  return '';
};

// Helper to get the effective flag code for a country (handles UK nations by name, emoji flags, etc.)
export const getEffectiveFlagCode = (countryName: string, storedFlag?: string): { code: string; isSubdivision: boolean } => {
  // First, check for special region codes (UK nations, etc.)
  const regionCode = getRegionCode(countryName);
  if (regionCode) {
    const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(regionCode);
    return { code: regionCode, isSubdivision };
  }

  // Check if stored flag is already a valid ISO code
  const normalizedFlag = (storedFlag || '').trim().toUpperCase();
  const storedFlagIsCode = /^[A-Z]{2}(-[A-Z]{3})?$/.test(normalizedFlag);
  if (storedFlagIsCode) {
    const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(normalizedFlag);
    return { code: normalizedFlag, isSubdivision };
  }

  // Try to extract code from emoji flag (e.g., 🇨🇴 → CO)
  const emojiCode = emojiToCountryCode(storedFlag || '');
  if (emojiCode) {
    return { code: emojiCode, isSubdivision: false };
  }

  // Fall back to name-based lookup using comprehensive mapping
  const nameCode = getCodeFromName(countryName);
  if (nameCode) {
    const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(nameCode);
    return { code: nameCode, isSubdivision };
  }

  // Try the getAllCountries lookup as last resort
  const allCountries = getAllCountries();
  const match = allCountries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
  if (match) {
    const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(match.code);
    return { code: match.code, isSubdivision };
  }

  return { code: '', isSubdivision: false };
};

// Get country code (ISO 2-letter or subdivision) by name; empty string if not found
export const getCountryCode = (name: string): string => {
  if (!name?.trim()) return '';
  const normalized = name.trim().toLowerCase();
  const all = getAllCountries();
  const exact = all.find((c) => c.name.toLowerCase() === normalized);
  if (exact) return exact.code;
  const region = getRegionCode(name);
  if (region) return region;
  const partial = all.find((c) => c.name.toLowerCase().includes(normalized) || normalized.includes(c.name.toLowerCase()));
  return partial?.code ?? '';
};

// Search countries by name (including aliases)
export const searchCountries = (query: string): CountryOption[] => {
  const lowercaseQuery = query.toLowerCase().trim();
  if (!lowercaseQuery) return [];

  const allCountries = getAllCountries();

  return allCountries.filter(country => {
    // Check if the country name matches
    if (country.name.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    // Check if any alias matches
    const aliases = countryAliases[country.code];
    if (aliases) {
      return aliases.some(alias => alias.includes(lowercaseQuery));
    }
    return false;
  });
};
