// Comprehensive subdivision data for all countries using iso-3166-2
import iso3166 from 'iso-3166-2';

export interface SubdivisionInfo {
  type: string;
  name: string;
}

// Get all subdivisions for a country by its ISO 2 code
export const getSubdivisionsForCountry = (countryCode: string): Record<string, string> | null => {
  const country = iso3166.country(countryCode);
  if (!country || !country.sub || Object.keys(country.sub).length === 0) {
    return null;
  }
  
  // Convert to a simple code -> name map
  const result: Record<string, string> = {};
  for (const [code, info] of Object.entries(country.sub)) {
    result[code] = (info as SubdivisionInfo).name;
  }
  return result;
};

// Get subdivision type label for a country (e.g., "States", "Provinces", etc.)
export const getSubdivisionLabel = (countryCode: string): string => {
  const country = iso3166.country(countryCode);
  if (!country || !country.sub) return 'Regions';
  
  // Get the first subdivision to determine the type
  const firstSub = Object.values(country.sub)[0] as SubdivisionInfo | undefined;
  if (!firstSub) return 'Regions';
  
  // Normalize common types
  const type = firstSub.type.toLowerCase();
  
  // Map to user-friendly labels
  const typeMapping: Record<string, string> = {
    'state': 'States',
    'province': 'Provinces',
    'region': 'Regions',
    'county': 'Counties',
    'prefecture': 'Prefectures',
    'department': 'Departments',
    'territory': 'Territories',
    'district': 'Districts',
    'canton': 'Cantons',
    'emirate': 'Emirates',
    'voivodeship': 'Voivodeships',
    'autonomous community': 'Communities',
    'municipality': 'Municipalities',
    'parish': 'Parishes',
    'governorate': 'Governorates',
    'division': 'Divisions',
    'oblast': 'Oblasts',
    'autonomous region': 'Regions',
    'autonomous province': 'Provinces',
    'commune': 'Communes',
    'island': 'Islands',
    'country': 'Countries', // For UK
  };
  
  for (const [key, label] of Object.entries(typeMapping)) {
    if (type.includes(key)) {
      return label;
    }
  }
  
  // Capitalize the type if no mapping found
  return firstSub.type.charAt(0).toUpperCase() + firstSub.type.slice(1) + 's';
};

// Check if a country has subdivisions
export const countryHasSubdivisions = (countryCode: string): boolean => {
  const country = iso3166.country(countryCode);
  return !!(country && country.sub && Object.keys(country.sub).length > 0);
};

// Get ISO3 to ISO2 code mapping from the library
export const iso3ToIso2All: Record<string, string> = iso3166.codes || {};

// Create ISO2 to ISO3 mapping (inverse)
export const iso2ToIso3All: Record<string, string> = Object.fromEntries(
  Object.entries(iso3ToIso2All).map(([iso3, iso2]) => [iso2 as string, iso3])
);

// Export the raw data for advanced usage
export const iso3166Data = iso3166.data;

// Get country name from code
export const getCountryNameFromCode = (code: string): string | null => {
  const country = iso3166.country(code);
  return country?.name || null;
};
