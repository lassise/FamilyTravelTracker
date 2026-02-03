/**
 * Affiliate URL Builder
 * 
 * Centralized utility for building affiliate booking URLs.
 * Designed to be extensible for hotels, experiences, and other travel services.
 * 
 * This provides a consistent interface for:
 * - Adding affiliate tracking parameters
 * - Building URLs for different providers (Booking.com, Viator, GetYourGuide, etc.)
 * - Future-proofing for additional affiliate partners
 */

export type AffiliateProvider =
  | 'booking.com'
  | 'viator'
  | 'getyourguide'
  | 'tripadvisor'
  | 'expedia'
  | 'airbnb'
  | 'google_flights'
  | 'custom';

export interface AffiliateUrlParams {
  provider: AffiliateProvider;
  baseUrl: string;
  affiliateId?: string;
  trackingParams?: Record<string, string>;
  // For future use: campaign tracking, user ID, etc.
  campaign?: string;
  userId?: string;
}

/**
 * Build an affiliate URL with tracking parameters
 * 
 * @param params - Affiliate URL parameters
 * @returns URL string with affiliate tracking appended
 * 
 * @example
 * buildAffiliateUrl({
 *   provider: 'booking.com',
 *   baseUrl: 'https://www.booking.com/hotel/example',
 *   affiliateId: 'your_affiliate_id',
 *   trackingParams: { checkin: '2024-01-15', checkout: '2024-01-20' }
 * })
 */
export const buildAffiliateUrl = (params: AffiliateUrlParams): string => {
  const { baseUrl, affiliateId, trackingParams, campaign, userId } = params;

  if (!baseUrl) return '';

  try {
    const url = new URL(baseUrl);

    // Add affiliate ID based on provider
    if (affiliateId) {
      switch (params.provider) {
        case 'booking.com':
          url.searchParams.set('aid', affiliateId);
          break;
        case 'viator':
          url.searchParams.set('pid', affiliateId);
          break;
        case 'getyourguide':
          url.searchParams.set('partner_id', affiliateId);
          break;
        case 'tripadvisor':
          url.searchParams.set('pid', affiliateId);
          break;
        case 'expedia':
          url.searchParams.set('affcid', affiliateId);
          break;
        case 'airbnb':
          url.searchParams.set('ref', affiliateId);
          break;
        case 'custom':
          // For custom providers, use a generic parameter
          url.searchParams.set('ref', affiliateId);
          break;
        case 'google_flights':
          // Google Flights doesn't use affiliate IDs in the same way
          // This is handled separately in googleFlightsUrl.ts
          break;
      }
    }

    // Add campaign tracking if provided
    if (campaign) {
      url.searchParams.set('utm_campaign', campaign);
    }

    // Add user tracking if provided (for analytics)
    if (userId) {
      url.searchParams.set('utm_source', 'app');
      url.searchParams.set('user_id', userId);
    }

    // Add any additional tracking parameters
    if (trackingParams) {
      Object.entries(trackingParams).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });
    }

    return url.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn('Failed to build affiliate URL:', error);
    return baseUrl;
  }
};

/**
 * Wrapper for opening affiliate URLs in a new window
 * Includes analytics tracking
 * 
 * @param url - The affiliate URL to open
 * @param provider - The affiliate provider (for analytics)
 */
export const openAffiliateUrl = (url: string, provider?: AffiliateProvider): void => {
  if (!url) return;

  // Track affiliate click (can be extended with analytics service)
  // Future: Add analytics tracking here
  // Example: analytics.track('affiliate_click', { provider, url });

  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Check if a URL is already an affiliate URL
 * Useful for avoiding double-wrapping
 */
export const isAffiliateUrl = (url: string): boolean => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const affiliateParams = ['aid', 'pid', 'partner_id', 'ref', 'affcid', 'utm_campaign'];
    return affiliateParams.some(param => urlObj.searchParams.has(param));
  } catch {
    return false;
  }
};

/**
 * Hotel-specific affiliate URL builder
 * Extensible for future hotel providers
 */
export interface HotelAffiliateParams {
  provider: 'booking.com' | 'expedia' | 'airbnb' | 'custom';
  baseUrl: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  affiliateId?: string;
  trackingParams?: Record<string, string>;
}

export const buildHotelAffiliateUrl = (params: HotelAffiliateParams): string => {
  const { checkIn, checkOut, guests, rooms, ...rest } = params;

  const trackingParams: Record<string, string> = {
    ...params.trackingParams,
  };

  if (checkIn) trackingParams.checkin = checkIn;
  if (checkOut) trackingParams.checkout = checkOut;
  if (guests) trackingParams.group_adults = guests.toString();
  if (rooms) trackingParams.no_rooms = rooms.toString();

  return buildAffiliateUrl({
    ...rest,
    trackingParams,
  });
};

/**
 * Experience/Activity-specific affiliate URL builder
 * Extensible for future experience providers
 */
export interface ExperienceAffiliateParams {
  provider: 'viator' | 'getyourguide' | 'tripadvisor' | 'custom';
  baseUrl: string;
  date?: string;
  participants?: number;
  affiliateId?: string;
  trackingParams?: Record<string, string>;
}

export const buildExperienceAffiliateUrl = (params: ExperienceAffiliateParams): string => {
  const { date, participants, ...rest } = params;

  const trackingParams: Record<string, string> = {
    ...params.trackingParams,
  };

  if (date) trackingParams.date = date;
  if (participants) trackingParams.participants = participants.toString();

  return buildAffiliateUrl({
    ...rest,
    trackingParams,
  });
};
