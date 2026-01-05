import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Country } from '@/hooks/useFamilyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';

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

  // Memoize country lists to prevent unnecessary recalculations
  const visitedCountries = useMemo(() => 
    countries
      .filter(c => c.visitedBy.length > 0)
      .map(c => countryToISO3[c.name])
      .filter(Boolean),
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

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mapbox-token`);
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
      zoom: 1.5,
      center: [30, 20],
      pitch: 20,
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

      setIsMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapToken]);

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
      </CardContent>
    </Card>
  );
};

export default InteractiveWorldMap;
