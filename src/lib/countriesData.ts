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
  
  cachedCountries = Object.entries(countries).map(([code, data]) => ({
    name: data.name,
    flag: getEmojiFlag(code as TCountryCode),
    continent: continentNames[data.continent] || data.continent,
    code,
  })).sort((a, b) => a.name.localeCompare(b.name));
  
  return cachedCountries;
};

// Country aliases for common alternative names
const countryAliases: Record<string, string[]> = {
  'GB': ['uk', 'britain', 'great britain', 'united kingdom'],
  'GB-SCT': ['scotland'],
  'GB-WLS': ['wales'],
  'GB-ENG': ['england'],
  'GB-NIR': ['northern ireland'],
  'US': ['usa', 'america', 'united states of america'],
  'AE': ['uae', 'emirates', 'dubai', 'abu dhabi'],
  'KR': ['south korea', 'korea'],
  'CZ': ['czechia'],
  'NL': ['holland'],
};

// Get code for special regions (returns subdivision code for UK nations)
export const getRegionCode = (name: string): string => {
  const lowerName = name.toLowerCase().trim();
  for (const [code, aliases] of Object.entries(countryAliases)) {
    if (aliases.includes(lowerName)) {
      return code;
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
