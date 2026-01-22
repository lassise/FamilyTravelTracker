import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Country } from '@/hooks/useFamilyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStateVisits, type StateVisit } from '@/hooks/useStateVisits';
import { getSubdivisionsForCountry, iso3ToIso2All, iso2ToIso3All, countryHasSubdivisions } from '@/lib/allSubdivisionsData';
import { getAllCountries, getEffectiveFlagCode } from '@/lib/countriesData';
import CountryFlag from '@/components/common/CountryFlag';
import { useHomeCountry } from '@/hooks/useHomeCountry';
import StateMapDialog from './StateMapDialog';
import PublicStateMapDialog from './PublicStateMapDialog';
import CountryQuickActionDialog from './CountryQuickActionDialog';
import MapColorSettings, { MapColors, defaultMapColors } from './MapColorSettings';
import CountryVisitDetailsDialog from '@/components/CountryVisitDetailsDialog';
import { toast } from 'sonner';
// Country to ISO 3166-1 alpha-3 mapping for Mapbox
const countryToISO3: Record<string, string> = {
  'Afghanistan': 'AFG', 'Albania': 'ALB', 'Algeria': 'DZA', 'Argentina': 'ARG',
  'Australia': 'AUS', 'Austria': 'AUT', 'Bangladesh': 'BGD', 'Belgium': 'BEL',
  'Brazil': 'BRA', 'Canada': 'CAN', 'Chile': 'CHL', 'China': 'CHN',
  'Colombia': 'COL', 'Croatia': 'HRV', 'Czech Republic': 'CZE', 'Denmark': 'DNK',
  'Egypt': 'EGY', 'Finland': 'FIN', 'France': 'FRA', 'Germany': 'DEU',
  'Greece': 'GRC', 'Hungary': 'HUN', 'Iceland': 'ISL', 'India': 'IND',
  'Indonesia': 'IDN', 'Iran': 'IRN', 'Iraq': 'IRQ', 'Ireland': 'IRL',
  'Israel': 'ISR', 'Italy': 'ITA', 'Japan': 'JPN', 'Jordan': 'JOR',
  'Kenya': 'KEN', 'Malaysia': 'MYS', 'Mexico': 'MEX', 'Morocco': 'MAR',
  'Nepal': 'NPL', 'Netherlands': 'NLD', 'New Zealand': 'NZL', 'Nigeria': 'NGA',
  'Norway': 'NOR', 'Pakistan': 'PAK', 'Peru': 'PER', 'Philippines': 'PHL',
  'Poland': 'POL', 'Portugal': 'PRT', 'Romania': 'ROU', 'Russia': 'RUS',
  'Saudi Arabia': 'SAU', 'Singapore': 'SGP', 'South Africa': 'ZAF',
  'South Korea': 'KOR', 'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'CHE',
  'Thailand': 'THA', 'Turkey': 'TUR', 'Ukraine': 'UKR', 'United Arab Emirates': 'ARE',
  'United Kingdom': 'GBR', 'United States': 'USA', 'Vietnam': 'VNM',
  'Ecuador': 'ECU', 'Venezuela': 'VEN', 'Cuba': 'CUB', 'Panama': 'PAN',
  'Costa Rica': 'CRI', 'Guatemala': 'GTM', 'Honduras': 'HND', 'Nicaragua': 'NIC',
  'El Salvador': 'SLV', 'Belize': 'BLZ', 'Jamaica': 'JAM', 'Haiti': 'HTI',
  'Dominican Republic': 'DOM', 'Puerto Rico': 'PRI', 'Trinidad and Tobago': 'TTO',
  'Bahamas': 'BHS', 'Barbados': 'BRB', 'Bolivia': 'BOL', 'Paraguay': 'PRY',
  'Uruguay': 'URY', 'Guyana': 'GUY', 'Suriname': 'SUR',
  'Antarctica': 'ATA',
  'Luxembourg': 'LUX', 'Malta': 'MLT', 'Cyprus': 'CYP', 'Slovenia': 'SVN',
  'Slovakia': 'SVK', 'Estonia': 'EST', 'Latvia': 'LVA', 'Lithuania': 'LTU',
  'Bulgaria': 'BGR', 'Serbia': 'SRB', 'Montenegro': 'MNE', 'North Macedonia': 'MKD',
  'Bosnia and Herzegovina': 'BIH', 'Kosovo': 'XKX', 'Moldova': 'MDA', 'Belarus': 'BLR',
  'Georgia': 'GEO', 'Armenia': 'ARM', 'Azerbaijan': 'AZE', 'Kazakhstan': 'KAZ',
  'Uzbekistan': 'UZB', 'Turkmenistan': 'TKM', 'Kyrgyzstan': 'KGZ', 'Tajikistan': 'TJK',
  'Mongolia': 'MNG', 'Taiwan': 'TWN', 'Hong Kong': 'HKG', 'Macau': 'MAC',
  'Sri Lanka': 'LKA', 'Myanmar': 'MMR', 'Cambodia': 'KHM', 'Laos': 'LAO',
  'Brunei': 'BRN', 'Papua New Guinea': 'PNG', 'Fiji': 'FJI',
  'Tunisia': 'TUN', 'Libya': 'LBY', 'Sudan': 'SDN', 'South Sudan': 'SSD',
  'Ethiopia': 'ETH', 'Tanzania': 'TZA', 'Uganda': 'UGA', 'Rwanda': 'RWA',
  'Ghana': 'GHA', 'Senegal': 'SEN', 'Ivory Coast': 'CIV', 'Cameroon': 'CMR',
  'Angola': 'AGO', 'Mozambique': 'MOZ', 'Zimbabwe': 'ZWE', 'Zambia': 'ZMB',
  'Botswana': 'BWA', 'Namibia': 'NAM', 'Madagascar': 'MDG', 'Mauritius': 'MUS',
  'Seychelles': 'SYC', 'Lebanon': 'LBN', 'Syria': 'SYR', 'Yemen': 'YEM',
  'Oman': 'OMN', 'Kuwait': 'KWT', 'Bahrain': 'BHR', 'Qatar': 'QAT',
};

// Reverse mapping: ISO3 to country name
const iso3ToCountryName: Record<string, string> = Object.fromEntries(
  Object.entries(countryToISO3).map(([name, iso3]) => [iso3, name])
);

// Use comprehensive ISO3 to ISO2 mapping from library
const iso3ToIso2 = iso3ToIso2All;
const iso2ToIso3 = iso2ToIso3All;

interface InteractiveWorldMapProps {
  countries: Country[];
  wishlist: string[];
  homeCountry?: string | null;
  onRefetch?: () => void;
  selectedMemberId?: string | null;
  readOnly?: boolean;
  stateVisitsOverride?: StateVisit[];
  // Pre-computed ISO3 codes for deterministic public rendering
  visitedISO3Override?: string[];
  wishlistISO3Override?: string[];
  homeISO3Override?: string;
}

// Validate that a color is a valid HSL/RGB/hex string
const validateColor = (color: string | undefined | null, fallback: string): string => {
  if (!color || typeof color !== 'string' || color.trim() === '') {
    console.warn(`Invalid color value: "${color}", using fallback: ${fallback}`);
    return fallback;
  }
  // Basic validation for hsl(), rgb(), or hex colors
  const isValidFormat = 
    color.startsWith('hsl(') || 
    color.startsWith('rgb(') || 
    color.startsWith('#') ||
    color.startsWith('hsla(') ||
    color.startsWith('rgba(');
  if (!isValidFormat) {
    console.warn(`Unrecognized color format: "${color}", using fallback: ${fallback}`);
    return fallback;
  }
  return color;
};

// Load colors from localStorage with validation
const loadMapColors = (): MapColors => {
  try {
    const saved = localStorage.getItem('map-colors');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        visited: validateColor(parsed.visited, defaultMapColors.visited),
        wishlist: validateColor(parsed.wishlist, defaultMapColors.wishlist),
        home: validateColor(parsed.home, defaultMapColors.home),
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved map colors, using defaults:', e);
    localStorage.removeItem('map-colors');
  }
  return { ...defaultMapColors };
};

const InteractiveWorldMap = ({
  countries,
  wishlist,
  homeCountry,
  onRefetch,
  selectedMemberId,
  readOnly,
  stateVisitsOverride,
  visitedISO3Override,
  wishlistISO3Override,
  homeISO3Override,
}: InteractiveWorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [mapColors, setMapColors] = useState<MapColors>(loadMapColors);
  const layersInitializedRef = useRef(false);
  const initRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Quick action dialog state
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [clickedCountryInfo, setClickedCountryInfo] = useState<{
    iso3: string;
    name: string;
    flag: string;
    continent: string;
  } | null>(null);
  
  // Visit details dialog state (for "Add Details" option)
  const [visitDetailsOpen, setVisitDetailsOpen] = useState(false);
  const [visitDetailsCountry, setVisitDetailsCountry] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);
  
  const { stateVisits } = useStateVisits();
  const effectiveStateVisits = useMemo(
    () => (readOnly ? (stateVisitsOverride ?? []) : stateVisits),
    [readOnly, stateVisitsOverride, stateVisits]
  );
  const getStateVisitCount = useCallback(
    (cc: string) => new Set(effectiveStateVisits.filter((sv) => sv.country_code === cc).map((sv) => sv.state_code)).size,
    [effectiveStateVisits]
  );
  
  // Use the home country hook for standardized handling
  const resolvedHome = useHomeCountry(homeCountry);

  // Save colors to localStorage when they change - with validation
  const handleColorsChange = useCallback((newColors: MapColors) => {
    const validatedColors: MapColors = {
      visited: validateColor(newColors.visited, defaultMapColors.visited),
      wishlist: validateColor(newColors.wishlist, defaultMapColors.wishlist),
      home: validateColor(newColors.home, defaultMapColors.home),
    };
    setMapColors(validatedColors);
    localStorage.setItem('map-colors', JSON.stringify(validatedColors));
  }, []);

  // Handle reset to defaults - clears localStorage and resets state
  const handleResetColors = useCallback(() => {
    localStorage.removeItem('map-colors');
    setMapColors({ ...defaultMapColors });
  }, []);

  // Memoize country lists to prevent unnecessary recalculations
  // Use the flag field which stores the ISO2 code to get ISO3
  // Use override ISO3 codes if provided (for deterministic public view), else compute from countries
  const visitedCountries = useMemo(() => {
    if (visitedISO3Override) return visitedISO3Override;
    return countries
      .filter(c => c.visitedBy.length > 0)
      .map(c => {
        const iso2FromFlag = c.flag?.toUpperCase();
        if (iso2FromFlag && iso2ToIso3[iso2FromFlag]) {
          return iso2ToIso3[iso2FromFlag];
        }
        return countryToISO3[c.name];
      })
      .filter(Boolean);
  }, [countries, visitedISO3Override]);

  // Create a map of country names to their IDs for quick lookup
  const countryNameToId = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach(c => map.set(c.name, c.id));
    return map;
  }, [countries]);

  // Use override home ISO3 if provided, else use resolved
  const homeCountryISO = homeISO3Override || resolvedHome.iso3;

  // Precompute full country list once to avoid repeated lookups
  const allCountriesList = useMemo(() => getAllCountries(), []);

  // Countries that support state-level tracking (all countries with subdivisions)
  const countriesWithStateTracking = useMemo(
    () =>
      countries.filter((c) => {
        const match = allCountriesList.find(ac => ac.name === c.name);
        const code = match?.code;
        const isHome = resolvedHome.isHomeCountry(c.name);
        const isVisited = c.visitedBy.length > 0;
        return (isVisited || isHome) && code && countryHasSubdivisions(code);
      }),
    [countries, resolvedHome, allCountriesList]
  );

  // Use override wishlist ISO3 codes if provided, else compute
  const wishlistCountries = useMemo(() => {
    if (wishlistISO3Override) return wishlistISO3Override;
    return countries
      .filter((c) => wishlist.includes(c.id))
      .map((c) => {
        const iso2FromFlag = c.flag?.toUpperCase();
        if (iso2FromFlag && iso2ToIso3[iso2FromFlag]) {
          return iso2ToIso3[iso2FromFlag];
        }
        return countryToISO3[c.name];
      })
      .filter(Boolean);
  }, [countries, wishlist, wishlistISO3Override]);

  // Country center coordinates for initial map view
  const countryCoordinates: Record<string, [number, number]> = {
    'USA': [-98.5, 39.8], 'CAN': [-106.3, 56.1], 'MEX': [-102.5, 23.6],
    'BRA': [-51.9, -14.2], 'ARG': [-63.6, -38.4], 'GBR': [-3.4, 55.4],
    'FRA': [2.2, 46.2], 'DEU': [10.5, 51.2], 'ITA': [12.6, 41.9],
    'ESP': [-3.7, 40.5], 'PRT': [-8.2, 39.4], 'NLD': [5.3, 52.1],
    'BEL': [4.5, 50.5], 'CHE': [8.2, 46.8], 'AUT': [14.6, 47.5],
    'POL': [19.1, 51.9], 'CZE': [15.5, 49.8], 'HUN': [19.5, 47.2],
    'GRC': [21.8, 39.1], 'TUR': [35.2, 39.0], 'RUS': [105.3, 61.5],
    'CHN': [104.2, 35.9], 'JPN': [138.3, 36.2], 'KOR': [127.8, 35.9],
    'IND': [78.9, 20.6], 'AUS': [133.8, -25.3], 'NZL': [174.9, -40.9],
    'ZAF': [22.9, -30.6], 'EGY': [30.8, 26.8], 'MAR': [-7.1, 31.8],
    'NGA': [8.7, 9.1], 'KEN': [37.9, -0.0], 'ARE': [53.8, 23.4],
    'SAU': [45.1, 23.9], 'ISR': [34.9, 31.0], 'THA': [100.5, 15.9],
    'VNM': [108.3, 14.1], 'SGP': [103.8, 1.4], 'MYS': [101.7, 4.2],
    'IDN': [113.9, -0.8], 'PHL': [121.8, 12.9], 'COL': [-74.3, 4.6],
    'PER': [-75.0, -9.2], 'CHL': [-71.5, -35.7], 'VEN': [-66.6, 6.4],
    'ECU': [-78.2, -1.8], 'CUB': [-77.8, 21.5], 'PAN': [-80.8, 8.5],
    'CRI': [-84.0, 9.7], 'GTM': [-90.2, 15.8], 'HND': [-86.2, 15.2],
    'NIC': [-85.2, 12.9], 'SLV': [-88.9, 13.8], 'JAM': [-77.3, 18.1],
    'DOM': [-70.2, 18.7], 'TTO': [-61.2, 10.7], 'URY': [-55.8, -32.5],
    'PRY': [-58.4, -23.4], 'BOL': [-63.6, -16.3], 'SWE': [18.6, 60.1],
    'NOR': [8.5, 60.5], 'DNK': [9.5, 56.3], 'FIN': [25.7, 61.9],
    'ISL': [-19.0, 65.0], 'IRL': [-8.2, 53.1], 'UKR': [31.2, 48.4],
    'ROU': [25.0, 45.9], 'HRV': [15.2, 45.1], 'BGD': [90.4, 23.7],
    'PAK': [69.3, 30.4], 'NPL': [84.1, 28.4], 'AFG': [67.7, 33.9],
    'IRN': [53.7, 32.4], 'IRQ': [43.7, 33.2], 'JOR': [36.2, 30.6],
    'DZA': [1.7, 28.0], 'BHS': [-77.4, 25.0], 'BRB': [-59.5, 13.2],
    'BLZ': [-88.5, 17.2], 'GUY': [-58.9, 4.9], 'SUR': [-56.0, 4.0],
  };

  const initialCenter = useMemo((): [number, number] => {
    if (homeCountryISO && countryCoordinates[homeCountryISO]) {
      return countryCoordinates[homeCountryISO];
    }
    return [30, 20];
  }, [homeCountryISO]);

  const openStateTrackingDialogForIso3 = useCallback(
    async (iso3?: string) => {
      if (!iso3) return;
      const iso2 = iso3ToIso2[iso3];
      if (!iso2) {
        toast.error('Could not identify this country');
        return;
      }
      
      // Check if this country has subdivisions
      if (!countryHasSubdivisions(iso2)) {
        // Country has no subdivisions - show a toast and don't open dialog
        const countryName = iso3ToCountryName[iso3] || iso3;
        toast.info(`${countryName} doesn't have region tracking available`);
        return;
      }

      const canonical = getAllCountries().find((c) => c.code === iso2);
      const countryName = canonical?.name ?? resolvedHome.name;
      if (!countryName) {
        toast.error('Could not identify this country');
        return;
      }

      const inMemory = countries.find((c) => c.name === countryName);
      if (inMemory) {
        setSelectedCountry(inMemory);
        setStateDialogOpen(true);
        return;
      }

      if (readOnly) {
        toast.info('Read-only: region tracking is only available for countries already on this dashboard');
        return;
      }

      try {
        const { data: existing } = await supabase
          .from('countries')
          .select('*')
          .eq('name', countryName)
          .limit(1);

        let row = existing?.[0] ?? null;

        if (!row) {
          const { data: userRes } = await supabase.auth.getUser();
          const userId = userRes.user?.id ?? null;

          const { data: inserted, error: insertError } = await supabase
            .from('countries')
            .insert({
              name: countryName,
              flag: canonical?.flag ?? '🏳️',
              continent: canonical?.continent ?? 'Unknown',
              user_id: userId,
            })
            .select('*')
            .single();

          if (insertError) throw insertError;
          row = inserted;
        }

        const hydrated: Country = {
          id: row.id,
          name: row.name,
          flag: row.flag,
          continent: row.continent,
          visitedBy: [],
        };

        setSelectedCountry(hydrated);
        setStateDialogOpen(true);
      } catch (err) {
        console.error('Failed to open state tracking dialog:', err);
        toast.error('Failed to open region tracker');
      }
    },
    [countries, resolvedHome.name, readOnly]
  );

  // Handle country click from map
  const handleCountryClick = useCallback(async (iso3: string) => {
    // Check if this country is visited or is the home country
    const isVisited = visitedCountries.includes(iso3);
    const isHome = iso3 === homeCountryISO;
    
    if (isVisited || isHome) {
      // Visited countries and home country go directly to state selection
      await openStateTrackingDialogForIso3(iso3);
    } else {
      if (readOnly) {
        toast.info('Read-only map: sign in to add countries');
        return;
      }
      // Unvisited countries show the quick action dialog (add visited, wishlist, etc.)
      const iso2 = iso3ToIso2[iso3];
      const allCountriesList = getAllCountries();
      // Try to find by ISO2 code first, then by name
      const match = allCountriesList.find(c => c.code === iso2);
      const countryName = match?.name || iso3ToCountryName[iso3] || iso3;
      
      setClickedCountryInfo({
        iso3,
        name: countryName,
        flag: match?.flag || '🏳️',
        continent: match?.continent || 'Unknown',
      });
      setQuickActionOpen(true);
    }
  }, [openStateTrackingDialogForIso3, visitedCountries, homeCountryISO, readOnly]);

  // Check if clicked country is the home country
  const isClickedCountryHomeCountry = useMemo(() => {
    if (!clickedCountryInfo || !resolvedHome.name) return false;
    return resolvedHome.isHomeCountry(clickedCountryInfo.name);
  }, [clickedCountryInfo, resolvedHome]);

  // Check if clicked country is visited or wishlisted
  const isClickedCountryVisited = useMemo(() => {
    if (!clickedCountryInfo) return false;
    return visitedCountries.includes(clickedCountryInfo.iso3);
  }, [clickedCountryInfo, visitedCountries]);

  const isClickedCountryWishlisted = useMemo(() => {
    if (!clickedCountryInfo) return false;
    return wishlistCountries.includes(clickedCountryInfo.iso3);
  }, [clickedCountryInfo, wishlistCountries]);

  const handleOpenStateTracking = useCallback((countryId: string, countryName: string) => {
    const country = countries.find(c => c.id === countryId || c.name === countryName);
    if (country) {
      setSelectedCountry(country);
      setStateDialogOpen(true);
    }
  }, [countries]);

  // Handler for opening visit details dialog (from quick action)
  const handleOpenVisitDetails = useCallback((countryId: string, countryName: string, countryCode: string) => {
    setVisitDetailsCountry({ id: countryId, name: countryName, code: countryCode });
    setVisitDetailsOpen(true);
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      const fallbackToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

      try {
        // This backend function returns a public Mapbox token and does not require auth.
        // Using invoke keeps URLs consistent across environments.
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        const token = (data as any)?.token as string | undefined;

        if (!error && token) {
          setMapToken(token);
          return;
        }

        if (error) {
          console.warn('Mapbox token fetch failed (non-fatal):', error);
        }

        // Fall back to env token to avoid a blank map.
        if (fallbackToken) {
          setMapToken(fallbackToken);
        } else {
          console.error('No Mapbox token available (function failed and no fallback configured)');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        // Last-resort fallback to env token to keep map rendering
        if (fallbackToken) {
          setMapToken(fallbackToken);
        }
      }
    };
    fetchToken();
  }, []);

  // Store a ref to the current colors to use in map initialization
  const colorsRef = useRef(mapColors);
  useEffect(() => {
    colorsRef.current = mapColors;
  }, [mapColors]);

  // Initialize map once - with improved reliability
  useEffect(() => {
    if (!mapContainer.current || !mapToken || map.current) return;

    // Ensure container has non-zero dimensions before initializing
    const containerRect = mapContainer.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
      // Retry after a short delay if container not ready
      initRetryTimeoutRef.current = setTimeout(() => {
        // Force a re-check by triggering the effect again
        setIsMapReady(prev => prev); // This won't change anything but will help with timing
      }, 100);
      return;
    }

    mapboxgl.accessToken = mapToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      projection: 'globe',
      zoom: homeCountryISO ? 1.8 : 1.2,
      center: initialCenter,
      pitch: 15,
      dragRotate: true,
      failIfMajorPerformanceCaveat: false, // Don't fail on low-end devices
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.enable();
    map.current.dragPan.enable();

    const initLayers = () => {
      if (!map.current) return;

      // Guard: avoid double-initializing layers/sources
      if (layersInitializedRef.current || map.current.getSource('countries')) {
        setIsMapReady(true);
        return;
      }

      layersInitializedRef.current = true;

      map.current.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(200, 200, 225)',
        'horizon-blend': 0.2,
      });

      map.current.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
      });

      // Use defaultMapColors for initial layer creation - colors will be updated by separate effect
      const initialColors = colorsRef.current;

      // Home country layer
      map.current.addLayer({
        id: 'home-country',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': validateColor(initialColors.home, defaultMapColors.home),
          'fill-opacity': 0.5,
        },
        filter: ['in', 'iso_3166_1_alpha_3', ''],
      });

      // Visited countries layer
      map.current.addLayer({
        id: 'visited-countries',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': validateColor(initialColors.visited, defaultMapColors.visited),
          'fill-opacity': 0.6,
        },
        filter: ['in', 'iso_3166_1_alpha_3', ''],
      });

      // Wishlist countries layer
      map.current.addLayer({
        id: 'wishlist-countries',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': validateColor(initialColors.wishlist, defaultMapColors.wishlist),
          'fill-opacity': 0.4,
        },
        filter: ['in', 'iso_3166_1_alpha_3', ''],
      });

      map.current.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': 'hsl(20, 14%, 50%)',
          'line-width': 0.5,
        },
      });

      // Click layer for ALL countries
      map.current.addLayer({
        id: 'clickable-countries',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': 'rgba(0,0,0,0)',
          'fill-opacity': 0,
        },
        filter: ['has', 'iso_3166_1_alpha_3'],
      });

      map.current.on('click', 'clickable-countries', (e) => {
        if (!e.features?.[0]) return;
        const iso3 = e.features[0].properties?.iso_3166_1_alpha_3 as string | undefined;
        if (iso3) {
          handleCountryClick(iso3);
        }
      });

      map.current.on('mouseenter', 'clickable-countries', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'clickable-countries', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      // Resize the map after initialization to ensure proper rendering
      setTimeout(() => {
        map.current?.resize();
      }, 100);

      setIsMapReady(true);
    };

    // Handle style loading errors and retry
    let styleLoadTimeout: NodeJS.Timeout | null = null;
    
    const handleStyleError = () => {
      console.warn('Mapbox style failed to load, attempting reload...');
      if (map.current) {
        map.current.setStyle('mapbox://styles/mapbox/light-v11');
      }
    };

    // Set a timeout to detect if style never loads
    styleLoadTimeout = setTimeout(() => {
      if (!layersInitializedRef.current && map.current) {
        console.warn('Mapbox style load timeout, forcing rehydration...');
        try {
          map.current.setStyle('mapbox://styles/mapbox/light-v11');
        } catch (err) {
          console.error('Failed to reload Mapbox style:', err);
        }
      }
    }, 8000); // 8 second timeout

    map.current.on('error', (e) => {
      console.error('Mapbox error:', e.error);
      // Only handle style-related errors
      if (e.error?.message?.includes('style')) {
        handleStyleError();
      }
    });

    // Mapbox can fire `style.load` before listeners are attached depending on timing.
    // Listen to both `load` and `style.load`, and also attempt immediate init when possible.
    map.current.on('load', () => {
      if (styleLoadTimeout) clearTimeout(styleLoadTimeout);
      initLayers();
    });
    
    map.current.on('style.load', () => {
      if (styleLoadTimeout) clearTimeout(styleLoadTimeout);
      initLayers();
    });

    if (map.current.isStyleLoaded()) {
      if (styleLoadTimeout) clearTimeout(styleLoadTimeout);
      initLayers();
    }

    return () => {
      if (styleLoadTimeout) clearTimeout(styleLoadTimeout);
      if (initRetryTimeoutRef.current) clearTimeout(initRetryTimeoutRef.current);
      layersInitializedRef.current = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapToken, initialCenter, homeCountryISO, handleCountryClick]);

  // Handle window resize and visibility changes
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const handleResize = () => {
      // Debounce resize calls
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && map.current) {
        setTimeout(() => {
          map.current?.resize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also call resize on initial ready state
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMapReady]);

  // Re-apply colors/filters whenever the style data updates (covers style reloads or delayed source load)
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const reapply = () => {
      try {
        map.current?.setFilter('home-country', homeCountryISO ? ['==', 'iso_3166_1_alpha_3', homeCountryISO] : ['in', 'iso_3166_1_alpha_3', '']);
        map.current?.setFilter('visited-countries', ['in', 'iso_3166_1_alpha_3', ...visitedCountries]);
        map.current?.setFilter('wishlist-countries', ['in', 'iso_3166_1_alpha_3', ...wishlistCountries]);
        map.current?.setPaintProperty('home-country', 'fill-color', validateColor(mapColors.home, defaultMapColors.home));
        map.current?.setPaintProperty('visited-countries', 'fill-color', validateColor(mapColors.visited, defaultMapColors.visited));
        map.current?.setPaintProperty('wishlist-countries', 'fill-color', validateColor(mapColors.wishlist, defaultMapColors.wishlist));
      } catch (err) {
        console.warn('Failed to reapply map styles after styledata event:', err);
      }
    };

    map.current.on('styledata', reapply);
    return () => {
      map.current?.off('styledata', reapply);
    };
  }, [isMapReady, homeCountryISO, visitedCountries, wishlistCountries, mapColors]);

  // Update filters when countries change (without re-creating map)
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Ensure style is fully loaded before setting filters
    const updateFilters = () => {
      if (!map.current) return;
      try {
        map.current.setFilter('home-country', homeCountryISO ? ['==', 'iso_3166_1_alpha_3', homeCountryISO] : ['in', 'iso_3166_1_alpha_3', '']);
        map.current.setFilter('visited-countries', ['in', 'iso_3166_1_alpha_3', ...visitedCountries]);
        map.current.setFilter('wishlist-countries', ['in', 'iso_3166_1_alpha_3', ...wishlistCountries]);
      } catch (err) {
        console.warn('Failed to set map filters:', err);
      }
    };

    if (map.current.isStyleLoaded()) {
      updateFilters();
    } else {
      map.current.once('style.load', updateFilters);
    }
  }, [visitedCountries, wishlistCountries, homeCountryISO, isMapReady]);

  // Update colors when they change - with layer existence checks and validation
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const updateLayerColor = (layerId: string, color: string, fallback: string) => {
      try {
        if (!map.current?.getLayer(layerId)) {
          console.warn(`Layer "${layerId}" not found, skipping color update`);
          return;
        }
        const validColor = validateColor(color, fallback);
        map.current.setPaintProperty(layerId, 'fill-color', validColor);
      } catch (err) {
        console.error(`Failed to update color for layer "${layerId}":`, err);
      }
    };

    const updateColors = () => {
      updateLayerColor('home-country', mapColors.home, defaultMapColors.home);
      updateLayerColor('visited-countries', mapColors.visited, defaultMapColors.visited);
      updateLayerColor('wishlist-countries', mapColors.wishlist, defaultMapColors.wishlist);
    };

    if (map.current.isStyleLoaded()) {
      updateColors();
    } else {
      map.current.once('style.load', updateColors);
    }
  }, [mapColors, isMapReady]);

  if (!mapToken) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5 text-primary" />
            World Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-2 animate-pulse" />
              <p>Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5 text-primary" />
            World Explorer
          </CardTitle>
          <MapColorSettings colors={mapColors} onColorsChange={handleColorsChange} onReset={handleResetColors} />
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          {homeCountry && (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full opacity-70" style={{ backgroundColor: mapColors.home }} />
              Home
            </span>
          )}
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full opacity-70" style={{ backgroundColor: mapColors.visited }} />
            Visited ({visitedCountries.length})
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full opacity-70" style={{ backgroundColor: mapColors.wishlist }} />
            Wishlist ({wishlistCountries.length})
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {readOnly ? 'Click a visited/home country to view regions' : 'Click any country to add or remove it'}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div ref={mapContainer} className="h-[450px] w-full" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card/20 to-transparent" />
        </div>
        
        {/* Countries with state tracking */}
        <div className="p-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {countriesWithStateTracking.length > 0 
              ? "Track states/regions for visited countries:"
              : "Mark a country as visited to track states/regions"
            }
          </p>
          <div className="flex flex-wrap gap-2">
            {countriesWithStateTracking.length > 0 ? (
              countriesWithStateTracking.map(country => {
                const match = allCountriesList.find(ac => ac.name === country.name);
                const code = match?.code || '';
                const states = getSubdivisionsForCountry(code);
                const stateCount = getStateVisitCount(code);
                const totalStates = states ? Object.keys(states).length : 0;
                const isUSA = country.name === 'United States';
                
                const { code: flagCode, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                return (
                  <Badge
                    key={country.id}
                    variant={isUSA ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      isUSA 
                        ? "bg-primary hover:bg-primary/90" 
                        : "hover:bg-primary/10"
                    }`}
                    onClick={() => {
                      setSelectedCountry(country);
                      setStateDialogOpen(true);
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isSubdivision || flagCode ? (
                        <CountryFlag countryCode={flagCode} countryName={country.name} size="sm" />
                      ) : (
                        country.flag
                      )}
                      {country.name}
                    </span>
                    {stateCount > 0 ? (
                      <span className={`ml-1 ${isUSA ? "text-primary-foreground" : "text-primary"}`}>
                        ({stateCount}/{totalStates})
                      </span>
                    ) : (
                      <span className="ml-1 opacity-70">({totalStates} regions)</span>
                    )}
                  </Badge>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Countries like USA, Canada, Australia, and more support state-level tracking
              </p>
            )}
          </div>
        </div>
      </CardContent>
      
       {readOnly ? (
         <PublicStateMapDialog
           open={stateDialogOpen}
           onOpenChange={setStateDialogOpen}
           country={selectedCountry}
           stateVisits={effectiveStateVisits}
         />
       ) : (
         <StateMapDialog
           open={stateDialogOpen}
           onOpenChange={setStateDialogOpen}
           country={selectedCountry}
           selectedMemberId={selectedMemberId}
         />
       )}

       {!readOnly && (
         <CountryQuickActionDialog
           open={quickActionOpen}
           onOpenChange={setQuickActionOpen}
           countryInfo={clickedCountryInfo}
           isVisited={isClickedCountryVisited}
           isWishlisted={isClickedCountryWishlisted}
           isHomeCountry={isClickedCountryHomeCountry}
           onActionComplete={() => {
             onRefetch?.();
           }}
           onOpenStateTracking={handleOpenStateTracking}
           onOpenVisitDetails={handleOpenVisitDetails}
         />
       )}

      {/* Visit Details Dialog for "Add Details" option */}
       {!readOnly && visitDetailsCountry && (
        <CountryVisitDetailsDialog
          countryId={visitDetailsCountry.id}
          countryName={visitDetailsCountry.name}
          countryCode={visitDetailsCountry.code}
          onUpdate={() => {
            onRefetch?.();
          }}
          open={visitDetailsOpen}
          onOpenChange={(open) => {
            setVisitDetailsOpen(open);
            if (!open) setVisitDetailsCountry(null);
          }}
        />
      )}
    </Card>
  );
};

export default InteractiveWorldMap;
