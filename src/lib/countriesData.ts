import { countries, getEmojiFlag, type TCountryCode } from 'countries-list';

export interface CountryOption {
  name: string;
  flag: string;
  continent: string;
  code: string;
}

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

// Helper to get the effective flag code for a country (handles UK nations by name)
export const getEffectiveFlagCode = (countryName: string, storedFlag?: string): { code: string; isSubdivision: boolean } => {
  const regionCode = getRegionCode(countryName);
  const normalizedFlag = (storedFlag || '').trim().toUpperCase();
  const storedFlagIsCode = /^[A-Z]{2}(-[A-Z]{3})?$/.test(normalizedFlag);
  const effectiveCode = (regionCode || (storedFlagIsCode ? normalizedFlag : '')).toUpperCase();
  const isSubdivision = /^[A-Z]{2}-[A-Z]{3}$/.test(effectiveCode);
  return { code: effectiveCode, isSubdivision };
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
