import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Country } from '@/hooks/useFamilyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStateVisits } from '@/hooks/useStateVisits';
import { countriesWithStates, countryNameToCode, getStatesForCountry } from '@/lib/statesData';
import StateMapDialog from './StateMapDialog';

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
};

// ISO3 to ISO2 mapping for state lookups
const iso3ToIso2: Record<string, string> = {
  'USA': 'US', 'CAN': 'CA', 'AUS': 'AU', 'BRA': 'BR', 'MEX': 'MX',
  'IND': 'IN', 'DEU': 'DE', 'GBR': 'GB', 'FRA': 'FR', 'ITA': 'IT',
  'ESP': 'ES', 'JPN': 'JP', 'CHN': 'CN',
};

interface InteractiveWorldMapProps {
  countries: Country[];
  wishlist: string[];
  homeCountry?: string | null;
}

const InteractiveWorldMap = ({ countries, wishlist, homeCountry }: InteractiveWorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  
  const { stateVisits, getStateVisitCount } = useStateVisits();

  // Memoize country lists to prevent unnecessary recalculations
  const visitedCountries = useMemo(() => 
    countries
      .filter(c => c.visitedBy.length > 0)
      .map(c => countryToISO3[c.name])
      .filter(Boolean),
    [countries]
  );

  // Countries that support state-level tracking and are visited
  const countriesWithStateTracking = useMemo(() => 
    countries.filter(c => {
      const code = countryNameToCode[c.name];
      return c.visitedBy.length > 0 && code && countriesWithStates.includes(code);
    }),
    [countries]
  );

  const wishlistCountries = useMemo(() => 
    countries
      .filter(c => wishlist.includes(c.id))
      .map(c => countryToISO3[c.name])
      .filter(Boolean),
    [countries, wishlist]
  );

  const homeCountryISO = useMemo(() =>
    homeCountry ? countryToISO3[homeCountry] : null,
    [homeCountry]
  );

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
    return [30, 20]; // Default center
  }, [homeCountryISO]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No session found for Mapbox token fetch');
          return;
        }
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mapbox-token`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.token) {
          setMapToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !mapToken || map.current) return;

    mapboxgl.accessToken = mapToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      projection: 'globe',
      zoom: homeCountryISO ? 1.8 : 1.2,
      center: initialCenter,
      pitch: 15,
      dragRotate: true,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    // Enable scroll zoom for better interaction
    map.current.scrollZoom.enable();
    map.current.dragPan.enable();

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(200, 200, 225)',
        'horizon-blend': 0.2,
      });

      map.current?.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
      });

      // Home country layer - purple/violet
      map.current?.addLayer({
        id: 'home-country',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': 'hsl(280, 70%, 50%)',
          'fill-opacity': 0.5,
        },
        filter: ['in', 'iso_3166_1_alpha_3', ''],
      });

      // Visited countries layer - green
      map.current?.addLayer({
        id: 'visited-countries',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': 'hsl(142, 70%, 45%)',
          'fill-opacity': 0.6,
        },
        filter: ['in', 'iso_3166_1_alpha_3', ''],
      });

      map.current?.addLayer({
        id: 'wishlist-countries',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': 'hsl(200, 85%, 55%)',
          'fill-opacity': 0.4,
        },
        filter: ['in', 'iso_3166_1_alpha_3', ''],
      });

      map.current?.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': 'hsl(20, 14%, 50%)',
          'line-width': 0.5,
        },
      });

      // Add click handler for countries with state tracking
      map.current?.on('click', 'visited-countries', (e) => {
        if (!e.features?.[0]) return;
        const iso3 = e.features[0].properties?.iso_3166_1_alpha_3;
        const iso2 = iso3ToIso2[iso3];
        
        if (iso2 && countriesWithStates.includes(iso2)) {
          const clickedCountry = countries.find(c => countryToISO3[c.name] === iso3);
          if (clickedCountry) {
            setSelectedCountry(clickedCountry);
            setStateDialogOpen(true);
          }
        }
      });

      // Change cursor on hover for clickable countries
      map.current?.on('mouseenter', 'visited-countries', (e) => {
        if (!e.features?.[0]) return;
        const iso3 = e.features[0].properties?.iso_3166_1_alpha_3;
        const iso2 = iso3ToIso2[iso3];
        
        if (iso2 && countriesWithStates.includes(iso2)) {
          map.current!.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current?.on('mouseleave', 'visited-countries', () => {
        map.current!.getCanvas().style.cursor = '';
      });

      setIsMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapToken, initialCenter, homeCountryISO, countries]);

  // Update filters when countries change (without re-creating map)
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    map.current.setFilter('home-country', homeCountryISO ? ['==', 'iso_3166_1_alpha_3', homeCountryISO] : ['in', 'iso_3166_1_alpha_3', '']);
    map.current.setFilter('visited-countries', ['in', 'iso_3166_1_alpha_3', ...visitedCountries]);
    map.current.setFilter('wishlist-countries', ['in', 'iso_3166_1_alpha_3', ...wishlistCountries]);
  }, [visitedCountries, wishlistCountries, homeCountryISO, isMapReady]);

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
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Globe className="h-5 w-5 text-primary" />
          World Explorer
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          {homeCountry && (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full opacity-70" style={{ backgroundColor: 'hsl(280, 70%, 50%)' }} />
              Home
            </span>
          )}
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full opacity-70" style={{ backgroundColor: 'hsl(142, 70%, 45%)' }} />
            Visited ({visitedCountries.length})
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-secondary opacity-70" />
            Wishlist ({wishlistCountries.length})
          </span>
        </div>
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
                const code = countryNameToCode[country.name];
                const states = getStatesForCountry(code);
                const stateCount = getStateVisitCount(code);
                const totalStates = states ? Object.keys(states).length : 0;
                const isUSA = country.name === 'United States';
                
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
                    {country.flag} {country.name}
                    {stateCount > 0 ? (
                      <span className={`ml-1 ${isUSA ? "text-primary-foreground" : "text-primary"}`}>
                        ({stateCount}/{totalStates})
                      </span>
                    ) : (
                      <span className="ml-1 opacity-70">({totalStates} states)</span>
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
      
      <StateMapDialog
        open={stateDialogOpen}
        onOpenChange={setStateDialogOpen}
        country={selectedCountry}
      />
    </Card>
  );
};

export default InteractiveWorldMap;
