// Country metadata for enhanced statistics
// Coordinates are approximate centers for distance calculations

export interface CountryMetadata {
  code: string;
  name: string;
  capital: string;
  population: number; // in millions
  area: number; // in km²
  lat: number;
  lng: number;
  isIsland: boolean;
  isLandlocked: boolean;
  hemisphere: {
    northSouth: 'north' | 'south' | 'both';
    eastWest: 'east' | 'west' | 'both';
  };
  region: string;
  g7: boolean;
  g20: boolean;
}

export const countryMetadata: Record<string, CountryMetadata> = {
  US: { code: 'US', name: 'United States', capital: 'Washington D.C.', population: 331, area: 9833520, lat: 39.8283, lng: -98.5795, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'North America', g7: true, g20: true },
  CA: { code: 'CA', name: 'Canada', capital: 'Ottawa', population: 38, area: 9984670, lat: 56.1304, lng: -106.3468, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'North America', g7: true, g20: true },
  MX: { code: 'MX', name: 'Mexico', capital: 'Mexico City', population: 128, area: 1964375, lat: 23.6345, lng: -102.5528, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'North America', g7: false, g20: true },
  GB: { code: 'GB', name: 'United Kingdom', capital: 'London', population: 67, area: 242495, lat: 55.3781, lng: -3.4360, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'both' }, region: 'Europe', g7: true, g20: true },
  FR: { code: 'FR', name: 'France', capital: 'Paris', population: 67, area: 643801, lat: 46.2276, lng: 2.2137, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: true, g20: true },
  DE: { code: 'DE', name: 'Germany', capital: 'Berlin', population: 83, area: 357022, lat: 51.1657, lng: 10.4515, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: true, g20: true },
  IT: { code: 'IT', name: 'Italy', capital: 'Rome', population: 60, area: 301340, lat: 41.8719, lng: 12.5674, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: true, g20: true },
  JP: { code: 'JP', name: 'Japan', capital: 'Tokyo', population: 126, area: 377975, lat: 36.2048, lng: 138.2529, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: true, g20: true },
  CN: { code: 'CN', name: 'China', capital: 'Beijing', population: 1411, area: 9596960, lat: 35.8617, lng: 104.1954, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: true },
  IN: { code: 'IN', name: 'India', capital: 'New Delhi', population: 1380, area: 3287263, lat: 20.5937, lng: 78.9629, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: true },
  BR: { code: 'BR', name: 'Brazil', capital: 'Brasília', population: 212, area: 8515767, lat: -14.2350, lng: -51.9253, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'both', eastWest: 'west' }, region: 'South America', g7: false, g20: true },
  RU: { code: 'RU', name: 'Russia', capital: 'Moscow', population: 144, area: 17098242, lat: 61.5240, lng: 105.3188, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'both' }, region: 'Europe/Asia', g7: false, g20: true },
  AU: { code: 'AU', name: 'Australia', capital: 'Canberra', population: 26, area: 7692024, lat: -25.2744, lng: 133.7751, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Oceania', g7: false, g20: true },
  ZA: { code: 'ZA', name: 'South Africa', capital: 'Pretoria', population: 59, area: 1221037, lat: -30.5595, lng: 22.9375, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: true },
  KR: { code: 'KR', name: 'South Korea', capital: 'Seoul', population: 52, area: 100210, lat: 35.9078, lng: 127.7669, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: true },
  AR: { code: 'AR', name: 'Argentina', capital: 'Buenos Aires', population: 45, area: 2780400, lat: -38.4161, lng: -63.6167, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'west' }, region: 'South America', g7: false, g20: true },
  SA: { code: 'SA', name: 'Saudi Arabia', capital: 'Riyadh', population: 35, area: 2149690, lat: 23.8859, lng: 45.0792, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Middle East', g7: false, g20: true },
  TR: { code: 'TR', name: 'Turkey', capital: 'Ankara', population: 84, area: 783562, lat: 38.9637, lng: 35.2433, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe/Asia', g7: false, g20: true },
  ID: { code: 'ID', name: 'Indonesia', capital: 'Jakarta', population: 274, area: 1904569, lat: -0.7893, lng: 113.9213, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'both', eastWest: 'east' }, region: 'Asia', g7: false, g20: true },
  ES: { code: 'ES', name: 'Spain', capital: 'Madrid', population: 47, area: 505992, lat: 40.4637, lng: -3.7492, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Europe', g7: false, g20: false },
  NL: { code: 'NL', name: 'Netherlands', capital: 'Amsterdam', population: 17, area: 41543, lat: 52.1326, lng: 5.2913, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  CH: { code: 'CH', name: 'Switzerland', capital: 'Bern', population: 9, area: 41285, lat: 46.8182, lng: 8.2275, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  AT: { code: 'AT', name: 'Austria', capital: 'Vienna', population: 9, area: 83879, lat: 47.5162, lng: 14.5501, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  BE: { code: 'BE', name: 'Belgium', capital: 'Brussels', population: 12, area: 30528, lat: 50.5039, lng: 4.4699, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  PT: { code: 'PT', name: 'Portugal', capital: 'Lisbon', population: 10, area: 92212, lat: 39.3999, lng: -8.2245, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Europe', g7: false, g20: false },
  GR: { code: 'GR', name: 'Greece', capital: 'Athens', population: 11, area: 131957, lat: 39.0742, lng: 21.8243, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  SE: { code: 'SE', name: 'Sweden', capital: 'Stockholm', population: 10, area: 450295, lat: 60.1282, lng: 18.6435, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  NO: { code: 'NO', name: 'Norway', capital: 'Oslo', population: 5, area: 323802, lat: 60.4720, lng: 8.4689, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  DK: { code: 'DK', name: 'Denmark', capital: 'Copenhagen', population: 6, area: 43094, lat: 56.2639, lng: 9.5018, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  FI: { code: 'FI', name: 'Finland', capital: 'Helsinki', population: 6, area: 338424, lat: 61.9241, lng: 25.7482, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  IE: { code: 'IE', name: 'Ireland', capital: 'Dublin', population: 5, area: 70273, lat: 53.1424, lng: -7.6921, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Europe', g7: false, g20: false },
  NZ: { code: 'NZ', name: 'New Zealand', capital: 'Wellington', population: 5, area: 268838, lat: -40.9006, lng: 174.8860, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Oceania', g7: false, g20: false },
  SG: { code: 'SG', name: 'Singapore', capital: 'Singapore', population: 6, area: 728, lat: 1.3521, lng: 103.8198, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  TH: { code: 'TH', name: 'Thailand', capital: 'Bangkok', population: 70, area: 513120, lat: 15.8700, lng: 100.9925, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  VN: { code: 'VN', name: 'Vietnam', capital: 'Hanoi', population: 97, area: 331212, lat: 14.0583, lng: 108.2772, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  PH: { code: 'PH', name: 'Philippines', capital: 'Manila', population: 110, area: 300000, lat: 12.8797, lng: 121.7740, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  MY: { code: 'MY', name: 'Malaysia', capital: 'Kuala Lumpur', population: 32, area: 330803, lat: 4.2105, lng: 101.9758, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  EG: { code: 'EG', name: 'Egypt', capital: 'Cairo', population: 102, area: 1002450, lat: 26.8206, lng: 30.8025, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  MA: { code: 'MA', name: 'Morocco', capital: 'Rabat', population: 37, area: 446550, lat: 31.7917, lng: -7.0926, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Africa', g7: false, g20: false },
  KE: { code: 'KE', name: 'Kenya', capital: 'Nairobi', population: 54, area: 580367, lat: -0.0236, lng: 37.9062, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'both', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  TZ: { code: 'TZ', name: 'Tanzania', capital: 'Dodoma', population: 60, area: 947303, lat: -6.3690, lng: 34.8888, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  IS: { code: 'IS', name: 'Iceland', capital: 'Reykjavik', population: 0.37, area: 103000, lat: 64.9631, lng: -19.0208, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Europe', g7: false, g20: false },
  CZ: { code: 'CZ', name: 'Czech Republic', capital: 'Prague', population: 11, area: 78867, lat: 49.8175, lng: 15.4730, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  PL: { code: 'PL', name: 'Poland', capital: 'Warsaw', population: 38, area: 312696, lat: 51.9194, lng: 19.1451, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  HU: { code: 'HU', name: 'Hungary', capital: 'Budapest', population: 10, area: 93028, lat: 47.1625, lng: 19.5033, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  HR: { code: 'HR', name: 'Croatia', capital: 'Zagreb', population: 4, area: 56594, lat: 45.1, lng: 15.2, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  PE: { code: 'PE', name: 'Peru', capital: 'Lima', population: 33, area: 1285216, lat: -9.19, lng: -75.0152, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  CL: { code: 'CL', name: 'Chile', capital: 'Santiago', population: 19, area: 756102, lat: -35.6751, lng: -71.543, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  CO: { code: 'CO', name: 'Colombia', capital: 'Bogotá', population: 51, area: 1141748, lat: 4.5709, lng: -74.2973, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  EC: { code: 'EC', name: 'Ecuador', capital: 'Quito', population: 18, area: 283561, lat: -1.8312, lng: -78.1834, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'both', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  CR: { code: 'CR', name: 'Costa Rica', capital: 'San José', population: 5, area: 51100, lat: 9.7489, lng: -83.7534, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  PA: { code: 'PA', name: 'Panama', capital: 'Panama City', population: 4, area: 75417, lat: 8.538, lng: -80.7821, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  JM: { code: 'JM', name: 'Jamaica', capital: 'Kingston', population: 3, area: 10991, lat: 18.1096, lng: -77.2975, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  CU: { code: 'CU', name: 'Cuba', capital: 'Havana', population: 11, area: 109884, lat: 21.5218, lng: -77.7812, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  DO: { code: 'DO', name: 'Dominican Republic', capital: 'Santo Domingo', population: 11, area: 48671, lat: 18.7357, lng: -70.1627, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  PR: { code: 'PR', name: 'Puerto Rico', capital: 'San Juan', population: 3, area: 9104, lat: 18.2208, lng: -66.5901, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  BS: { code: 'BS', name: 'Bahamas', capital: 'Nassau', population: 0.4, area: 13943, lat: 25.0343, lng: -77.3963, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  HK: { code: 'HK', name: 'Hong Kong', capital: 'Hong Kong', population: 7, area: 1104, lat: 22.3193, lng: 114.1694, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  TW: { code: 'TW', name: 'Taiwan', capital: 'Taipei', population: 24, area: 36193, lat: 23.6978, lng: 120.9605, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  AE: { code: 'AE', name: 'United Arab Emirates', capital: 'Abu Dhabi', population: 10, area: 83600, lat: 23.4241, lng: 53.8478, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Middle East', g7: false, g20: false },
  IL: { code: 'IL', name: 'Israel', capital: 'Jerusalem', population: 9, area: 20770, lat: 31.0461, lng: 34.8516, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Middle East', g7: false, g20: false },
  JO: { code: 'JO', name: 'Jordan', capital: 'Amman', population: 10, area: 89342, lat: 30.5852, lng: 36.2384, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Middle East', g7: false, g20: false },
  QA: { code: 'QA', name: 'Qatar', capital: 'Doha', population: 3, area: 11586, lat: 25.3548, lng: 51.1839, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Middle East', g7: false, g20: false },
  LK: { code: 'LK', name: 'Sri Lanka', capital: 'Colombo', population: 22, area: 65610, lat: 7.8731, lng: 80.7718, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  NP: { code: 'NP', name: 'Nepal', capital: 'Kathmandu', population: 29, area: 147181, lat: 28.3949, lng: 84.124, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  MV: { code: 'MV', name: 'Maldives', capital: 'Malé', population: 0.5, area: 298, lat: 3.2028, lng: 73.2207, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  FJ: { code: 'FJ', name: 'Fiji', capital: 'Suva', population: 0.9, area: 18274, lat: -17.7134, lng: 178.065, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Oceania', g7: false, g20: false },
  MT: { code: 'MT', name: 'Malta', capital: 'Valletta', population: 0.5, area: 316, lat: 35.9375, lng: 14.3754, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  CY: { code: 'CY', name: 'Cyprus', capital: 'Nicosia', population: 1.2, area: 9251, lat: 35.1264, lng: 33.4299, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  LU: { code: 'LU', name: 'Luxembourg', capital: 'Luxembourg City', population: 0.6, area: 2586, lat: 49.8153, lng: 6.1296, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  MC: { code: 'MC', name: 'Monaco', capital: 'Monaco', population: 0.04, area: 2, lat: 43.7384, lng: 7.4246, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  VA: { code: 'VA', name: 'Vatican City', capital: 'Vatican City', population: 0.0008, area: 0.44, lat: 41.9029, lng: 12.4534, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  SM: { code: 'SM', name: 'San Marino', capital: 'San Marino', population: 0.03, area: 61, lat: 43.9424, lng: 12.4578, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  RO: { code: 'RO', name: 'Romania', capital: 'Bucharest', population: 19, area: 238397, lat: 45.9432, lng: 24.9668, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  BG: { code: 'BG', name: 'Bulgaria', capital: 'Sofia', population: 7, area: 110879, lat: 42.7339, lng: 25.4858, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  UA: { code: 'UA', name: 'Ukraine', capital: 'Kyiv', population: 44, area: 603550, lat: 48.3794, lng: 31.1656, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  RS: { code: 'RS', name: 'Serbia', capital: 'Belgrade', population: 7, area: 88361, lat: 44.0165, lng: 21.0059, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  SI: { code: 'SI', name: 'Slovenia', capital: 'Ljubljana', population: 2, area: 20273, lat: 46.1512, lng: 14.9955, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  SK: { code: 'SK', name: 'Slovakia', capital: 'Bratislava', population: 5, area: 49035, lat: 48.669, lng: 19.699, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  EE: { code: 'EE', name: 'Estonia', capital: 'Tallinn', population: 1, area: 45228, lat: 58.5953, lng: 25.0136, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  LV: { code: 'LV', name: 'Latvia', capital: 'Riga', population: 2, area: 64559, lat: 56.8796, lng: 24.6032, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  LT: { code: 'LT', name: 'Lithuania', capital: 'Vilnius', population: 3, area: 65300, lat: 55.1694, lng: 23.8813, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Europe', g7: false, g20: false },
  NG: { code: 'NG', name: 'Nigeria', capital: 'Abuja', population: 206, area: 923768, lat: 9.082, lng: 8.6753, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  GH: { code: 'GH', name: 'Ghana', capital: 'Accra', population: 31, area: 238533, lat: 7.9465, lng: -1.0232, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Africa', g7: false, g20: false },
  ET: { code: 'ET', name: 'Ethiopia', capital: 'Addis Ababa', population: 115, area: 1104300, lat: 9.145, lng: 40.4897, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  UG: { code: 'UG', name: 'Uganda', capital: 'Kampala', population: 46, area: 241038, lat: 1.3733, lng: 32.2903, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  RW: { code: 'RW', name: 'Rwanda', capital: 'Kigali', population: 13, area: 26338, lat: -1.9403, lng: 29.8739, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  SN: { code: 'SN', name: 'Senegal', capital: 'Dakar', population: 17, area: 196722, lat: 14.4974, lng: -14.4524, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Africa', g7: false, g20: false },
  BW: { code: 'BW', name: 'Botswana', capital: 'Gaborone', population: 2, area: 581730, lat: -22.3285, lng: 24.6849, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  NA: { code: 'NA', name: 'Namibia', capital: 'Windhoek', population: 3, area: 824292, lat: -22.9576, lng: 18.4904, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  ZW: { code: 'ZW', name: 'Zimbabwe', capital: 'Harare', population: 15, area: 390757, lat: -19.0154, lng: 29.1549, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  MU: { code: 'MU', name: 'Mauritius', capital: 'Port Louis', population: 1, area: 2040, lat: -20.3484, lng: 57.5522, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  SC: { code: 'SC', name: 'Seychelles', capital: 'Victoria', population: 0.1, area: 459, lat: -4.6796, lng: 55.492, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  MG: { code: 'MG', name: 'Madagascar', capital: 'Antananarivo', population: 28, area: 587041, lat: -18.7669, lng: 46.8691, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'east' }, region: 'Africa', g7: false, g20: false },
  UY: { code: 'UY', name: 'Uruguay', capital: 'Montevideo', population: 3, area: 176215, lat: -32.5228, lng: -55.7658, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'south', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  PY: { code: 'PY', name: 'Paraguay', capital: 'Asunción', population: 7, area: 406752, lat: -23.4425, lng: -58.4438, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'south', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  BO: { code: 'BO', name: 'Bolivia', capital: 'Sucre', population: 12, area: 1098581, lat: -16.2902, lng: -63.5887, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'south', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  VE: { code: 'VE', name: 'Venezuela', capital: 'Caracas', population: 28, area: 916445, lat: 6.4238, lng: -66.5897, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'South America', g7: false, g20: false },
  GT: { code: 'GT', name: 'Guatemala', capital: 'Guatemala City', population: 18, area: 108889, lat: 15.7835, lng: -90.2308, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  HN: { code: 'HN', name: 'Honduras', capital: 'Tegucigalpa', population: 10, area: 112492, lat: 15.2, lng: -86.2419, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  NI: { code: 'NI', name: 'Nicaragua', capital: 'Managua', population: 7, area: 130373, lat: 12.8654, lng: -85.2072, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  SV: { code: 'SV', name: 'El Salvador', capital: 'San Salvador', population: 6, area: 21041, lat: 13.7942, lng: -88.8965, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  BZ: { code: 'BZ', name: 'Belize', capital: 'Belmopan', population: 0.4, area: 22966, lat: 17.1899, lng: -88.4976, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Central America', g7: false, g20: false },
  BB: { code: 'BB', name: 'Barbados', capital: 'Bridgetown', population: 0.3, area: 430, lat: 13.1939, lng: -59.5432, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  TT: { code: 'TT', name: 'Trinidad and Tobago', capital: 'Port of Spain', population: 1, area: 5131, lat: 10.6918, lng: -61.2225, isIsland: true, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'west' }, region: 'Caribbean', g7: false, g20: false },
  KH: { code: 'KH', name: 'Cambodia', capital: 'Phnom Penh', population: 17, area: 181035, lat: 12.5657, lng: 104.991, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  LA: { code: 'LA', name: 'Laos', capital: 'Vientiane', population: 7, area: 236800, lat: 19.8563, lng: 102.4955, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  MM: { code: 'MM', name: 'Myanmar', capital: 'Naypyidaw', population: 54, area: 676578, lat: 21.9162, lng: 95.956, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  MN: { code: 'MN', name: 'Mongolia', capital: 'Ulaanbaatar', population: 3, area: 1564116, lat: 46.8625, lng: 103.8467, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  KZ: { code: 'KZ', name: 'Kazakhstan', capital: 'Nur-Sultan', population: 19, area: 2724900, lat: 48.0196, lng: 66.9237, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  UZ: { code: 'UZ', name: 'Uzbekistan', capital: 'Tashkent', population: 34, area: 448978, lat: 41.3775, lng: 64.5853, isIsland: false, isLandlocked: true, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  PK: { code: 'PK', name: 'Pakistan', capital: 'Islamabad', population: 221, area: 881913, lat: 30.3753, lng: 69.3451, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
  BD: { code: 'BD', name: 'Bangladesh', capital: 'Dhaka', population: 165, area: 147570, lat: 23.685, lng: 90.3563, isIsland: false, isLandlocked: false, hemisphere: { northSouth: 'north', eastWest: 'east' }, region: 'Asia', g7: false, g20: false },
};

// Calculate distance between two coordinates using Haversine formula (returns km)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get country metadata by name (fuzzy match)
export function getCountryMetadataByName(name: string): CountryMetadata | undefined {
  const normalizedName = name.toLowerCase().trim();
  return Object.values(countryMetadata).find(c => 
    c.name.toLowerCase() === normalizedName ||
    c.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(c.name.toLowerCase())
  );
}

// Get country metadata by code
export function getCountryMetadataByCode(code: string): CountryMetadata | undefined {
  return countryMetadata[code.toUpperCase()];
}
