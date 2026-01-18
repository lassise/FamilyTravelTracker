import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { DistanceUnit } from '@/lib/distanceUtils';

export type { DistanceUnit };

// Detect if user's locale is likely metric
const detectMetricLocale = (): boolean => {
  const locale = navigator.language || 'en-US';
  // US, UK, and a few others use miles
  const imperialLocales = ['en-US', 'en-GB', 'my-MM', 'lr-LR'];
  return !imperialLocales.some(l => locale.startsWith(l.split('-')[0]) && locale.includes(l.split('-')[1] || ''));
};

export const useDistanceUnit = () => {
  const { user } = useAuth();
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(() => 
    detectMetricLocale() ? 'kilometers' : 'miles'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDistanceUnit = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('distance_unit')
        .eq('id', user.id)
        .single();

      if (data?.distance_unit) {
        setDistanceUnit(data.distance_unit as DistanceUnit);
      }
      setLoading(false);
    };

    fetchDistanceUnit();
  }, [user]);

  const updateDistanceUnit = useCallback(async (unit: DistanceUnit) => {
    if (!user) return;

    setDistanceUnit(unit); // Optimistic update

    const { error } = await supabase
      .from('profiles')
      .update({ distance_unit: unit })
      .eq('id', user.id);

    if (error) {
      // Revert on error
      setDistanceUnit(distanceUnit);
      throw error;
    }
  }, [user, distanceUnit]);

  return {
    distanceUnit,
    updateDistanceUnit,
    loading,
    isMetric: distanceUnit === 'kilometers',
  };
};
