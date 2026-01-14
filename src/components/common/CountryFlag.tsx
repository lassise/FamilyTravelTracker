import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  countryCode: string; // ISO 3166-1 alpha-2 code (e.g., "AT", "US")
  countryName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-4',
  md: 'w-8 h-6',
  lg: 'w-10 h-8',
  xl: 'w-12 h-9',
};

const initialsSizeClasses = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-8 h-6 text-xs',
  lg: 'w-10 h-8 text-sm',
  xl: 'w-12 h-9 text-base',
};

/**
 * Renders a country flag image from FlagCDN.
 * Falls back to initials if the image fails to load or the code is invalid.
 */
export const CountryFlag = ({ 
  countryCode, 
  countryName = '', 
  size = 'md',
  className 
}: CountryFlagProps) => {
  const [hasError, setHasError] = useState(false);
  
  // Validate and normalize country code
  const normalizedCode = (countryCode || '').trim().toUpperCase();
  
  // Handle subdivision codes like GB-SCT (Scotland), GB-WLS (Wales), GB-ENG (England)
  const isSubdivisionCode = /^[A-Z]{2}-[A-Z]{3}$/.test(normalizedCode);
  const isValidCode = /^[A-Z]{2}$/.test(normalizedCode) || isSubdivisionCode;
  const codeLower = normalizedCode.toLowerCase().replace('-', '-');
  
  // FlagCDN URL - use w80 for retina quality, CSS will handle display size
  const flagUrl = `https://flagcdn.com/w80/${codeLower}.png`;
  
  // Get initials for fallback
  const initials = isValidCode 
    ? normalizedCode 
    : (countryName || '').slice(0, 2).toUpperCase();
  
  // If code is invalid or image failed, show initials
  if (!isValidCode || hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted rounded font-semibold text-muted-foreground',
          initialsSizeClasses[size],
          className
        )}
        title={countryName || normalizedCode}
      >
        {initials}
      </div>
    );
  }
  
  return (
    <img
      src={flagUrl}
      alt={`${countryName || normalizedCode} flag`}
      className={cn(
        'object-cover rounded-sm shadow-sm',
        sizeClasses[size],
        className
      )}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

export default CountryFlag;
