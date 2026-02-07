import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { emojiToCountryCode, getCodeFromName } from '@/lib/countriesData';

interface CountryFlagProps {
  countryCode: string; // ISO 3166-1 alpha-2 code (e.g., "AT", "US") or emoji flag
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
 * 
 * Accepts ISO 3166-1 alpha-2 codes (e.g., "US", "CO") or subdivision codes (e.g., "GB-SCT").
 * Also attempts to extract codes from emoji flags (e.g., 🇨🇴 → "CO") as a fallback.
 */
export const CountryFlag = ({
  countryCode,
  countryName = '',
  size = 'md',
  className
}: CountryFlagProps) => {
  const [hasError, setHasError] = useState(false);

  // Normalize and resolve the country code
  const resolvedCode = useMemo(() => {
    const input = (countryCode || '').trim();
    const upperInput = input.toUpperCase();

    // Check if already a valid ISO code (2 letters or subdivision like GB-SCT)
    if (/^[A-Z]{2}$/.test(upperInput) || /^[A-Z]{2}-[A-Z]{3}$/.test(upperInput)) {
      return upperInput;
    }

    // Try to extract code from emoji flag (e.g., 🇨🇴 → "CO")
    const emojiCode = emojiToCountryCode(input);
    if (emojiCode) {
      return emojiCode;
    }

    // Try to look up code by country name as last resort
    if (countryName) {
      const nameCode = getCodeFromName(countryName);
      if (nameCode) {
        return nameCode.toUpperCase();
      }
    }

    // Return whatever we have (might be invalid)
    return upperInput;
  }, [countryCode, countryName]);

  // Handle subdivision codes like GB-SCT (Scotland), GB-WLS (Wales), GB-ENG (England)
  const isSubdivisionCode = /^[A-Z]{2}-[A-Z]{3}$/.test(resolvedCode);
  const isValidCode = /^[A-Z]{2}$/.test(resolvedCode) || isSubdivisionCode;
  const codeLower = resolvedCode.toLowerCase();

  // Scotland-specific override: use Flagpedia Saltire image (blue with white X)
  // Flagpedia provides the correct Scotland flag that matches the official Saltire design
  let flagUrl: string;
  if (resolvedCode === 'GB-SCT') {
    // Use Flagpedia for Scotland - w80 matches the flagcdn.com sizing for consistency
    flagUrl = 'https://flagpedia.net/data/flags/w80/gb-sct.webp';
  } else {
    // FlagCDN URL - use w80 for retina quality, CSS will handle display size
    flagUrl = `https://flagcdn.com/w80/${codeLower}.png`;
  }

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
