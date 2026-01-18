import type { DistanceUnit } from '@/hooks/useDistanceUnit';

// Conversion constants
const KM_TO_MILES = 0.621371;
const MILES_TO_KM = 1.60934;

/**
 * Convert kilometers to the specified unit
 * All internal calculations should be in km, this converts for display
 */
export function formatDistance(
  distanceInKm: number,
  unit: DistanceUnit,
  options?: {
    decimals?: number;
    includeUnit?: boolean;
    compact?: boolean;
  }
): string {
  const { decimals = 0, includeUnit = true, compact = false } = options || {};
  
  const convertedDistance = unit === 'miles' 
    ? distanceInKm * KM_TO_MILES 
    : distanceInKm;
  
  let formattedNumber: string;
  
  if (compact && convertedDistance >= 1000) {
    formattedNumber = `${(convertedDistance / 1000).toFixed(1)}K`;
  } else {
    formattedNumber = convertedDistance.toFixed(decimals);
    // Add thousands separators
    formattedNumber = Number(formattedNumber).toLocaleString();
  }
  
  if (!includeUnit) {
    return formattedNumber;
  }
  
  const unitLabel = unit === 'miles' ? 'mi' : 'km';
  return `${formattedNumber} ${unitLabel}`;
}

/**
 * Convert area from km² to mi² or keep as km²
 */
export function formatArea(
  areaInKmSq: number,
  unit: DistanceUnit,
  options?: {
    compact?: boolean;
    includeUnit?: boolean;
  }
): string {
  const { compact = true, includeUnit = true } = options || {};
  
  // 1 km² = 0.386102 mi²
  const convertedArea = unit === 'miles' 
    ? areaInKmSq * 0.386102 
    : areaInKmSq;
  
  let formattedNumber: string;
  
  if (compact && convertedArea >= 1000000) {
    formattedNumber = `${(convertedArea / 1000000).toFixed(1)}M`;
  } else if (compact && convertedArea >= 1000) {
    formattedNumber = `${Math.round(convertedArea / 1000)}K`;
  } else {
    formattedNumber = Math.round(convertedArea).toLocaleString();
  }
  
  if (!includeUnit) {
    return formattedNumber;
  }
  
  const unitLabel = unit === 'miles' ? 'mi²' : 'km²';
  return `${formattedNumber} ${unitLabel}`;
}

/**
 * Format density (per km² or per mi²)
 */
export function formatDensity(
  densityPerKmSq: number,
  unit: DistanceUnit
): string {
  // 1 person/km² = 2.59 people/mi² (since 1 mi² = 2.59 km²)
  const convertedDensity = unit === 'miles' 
    ? densityPerKmSq * 2.58999 
    : densityPerKmSq;
  
  const unitLabel = unit === 'miles' ? '/mi²' : '/km²';
  return `${Math.round(convertedDensity).toLocaleString()}${unitLabel}`;
}

/**
 * Get the unit label
 */
export function getDistanceUnitLabel(unit: DistanceUnit, short = true): string {
  if (short) {
    return unit === 'miles' ? 'mi' : 'km';
  }
  return unit === 'miles' ? 'miles' : 'kilometers';
}
