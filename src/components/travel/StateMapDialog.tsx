import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStateVisits } from '@/hooks/useStateVisits';
import { useFamilyData, Country } from '@/hooks/useFamilyData';
import { getStatesForCountry, countryNameToCode, countryMapCenters } from '@/lib/statesData';

interface StateMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
}

const StateMapDialog = ({ open, onOpenChange, country }: StateMapDialogProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { familyMembers } = useFamilyData();
  const countryCode = country ? countryNameToCode[country.name] : null;
  const { stateVisits, toggleStateVisit, refetch } = useStateVisits(countryCode || undefined);

  const states = useMemo(() => {
    if (!countryCode) return null;
    return getStatesForCountry(countryCode);
  }, [countryCode]);

  const visitedStateCodes = useMemo(() => {
    return new Set(stateVisits.map(sv => sv.state_code));
  }, [stateVisits]);

  // Initialize selected states from visits
  useEffect(() => {
    setSelectedStates(visitedStateCodes);
  }, [visitedStateCodes]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapToken || !open || !countryCode) return;

    // Clean up existing map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    mapboxgl.accessToken = mapToken;

    const mapConfig = countryMapCenters[countryCode] || { center: [0, 0] as [number, number], zoom: 4 };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      zoom: mapConfig.zoom,
      center: mapConfig.center,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

    map.current.on('style.load', () => {
      // Add boundaries source for states/provinces
      map.current?.addSource('boundaries', {
        type: 'vector',
        url: 'mapbox://mapbox.boundaries-adm1-v4',
      });

      // Layer for visited states
      map.current?.addLayer({
        id: 'visited-states',
        type: 'fill',
        source: 'boundaries',
        'source-layer': 'boundaries_admin_1',
        paint: {
          'fill-color': 'hsl(142, 70%, 45%)',
          'fill-opacity': 0.6,
        },
        filter: ['in', 'iso_3166_2', ''],
      });

      // Border layer
      map.current?.addLayer({
        id: 'state-borders',
        type: 'line',
        source: 'boundaries',
        'source-layer': 'boundaries_admin_1',
        paint: {
          'line-color': 'hsl(20, 14%, 50%)',
          'line-width': 1,
        },
        filter: ['==', ['slice', ['get', 'iso_3166_2'], 0, 2], countryCode],
      });

      setIsMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setIsMapReady(false);
    };
  }, [mapToken, open, countryCode]);

  // Update map filters when selected states change
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const stateCodesToHighlight = Array.from(selectedStates);
    map.current.setFilter('visited-states', ['in', 'iso_3166_2', ...stateCodesToHighlight]);
  }, [selectedStates, isMapReady]);

  const handleStateToggle = (stateCode: string) => {
    setSelectedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateCode)) {
        newSet.delete(stateCode);
      } else {
        newSet.add(stateCode);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!country || !countryCode || !states) return;
    
    setIsSaving(true);
    
    // Get the first family member (or could show a selector)
    const primaryMember = familyMembers[0];
    if (!primaryMember) {
      setIsSaving(false);
      return;
    }

    try {
      // Find states to add (in selected but not in visited)
      const statesToAdd = Array.from(selectedStates).filter(sc => !visitedStateCodes.has(sc));
      // Find states to remove (in visited but not in selected)
      const statesToRemove = Array.from(visitedStateCodes).filter(sc => !selectedStates.has(sc));

      for (const stateCode of statesToAdd) {
        const stateName = states[stateCode] || stateCode;
        await toggleStateVisit(country.id, countryCode, stateCode, stateName, primaryMember.id);
      }

      for (const stateCode of statesToRemove) {
        const stateName = states[stateCode] || stateCode;
        await toggleStateVisit(country.id, countryCode, stateCode, stateName, primaryMember.id);
      }

      await refetch();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving state visits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!country || !countryCode || !states) {
    return null;
  }

  const stateEntries = Object.entries(states);
  const visitedCount = selectedStates.size;
  const totalCount = stateEntries.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {country.flag} {country.name} - States & Regions
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Map */}
          <div className="relative h-[400px] rounded-lg overflow-hidden border">
            {mapToken ? (
              <div ref={mapContainer} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            )}
          </div>

          {/* State List */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">
                {visitedCount} / {totalCount} visited
              </Badge>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedStates(new Set(stateEntries.map(([code]) => code)))}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStates(new Set())}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>

            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-2">
                {stateEntries.map(([code, name]) => (
                  <div
                    key={code}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleStateToggle(code)}
                  >
                    <Checkbox
                      checked={selectedStates.has(code)}
                      onCheckedChange={() => handleStateToggle(code)}
                    />
                    <span className="text-sm flex-1">{name}</span>
                    {selectedStates.has(code) && (
                      <Badge variant="default" className="text-xs">
                        Visited
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="lg" className="px-8">
                {isSaving ? 'Saving...' : 'Save States'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StateMapDialog;
