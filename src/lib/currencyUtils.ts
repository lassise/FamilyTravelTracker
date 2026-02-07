/**
 * Currency Conversion Utility
 * Handles converting between different currencies for accurate flight price comparison
 */

// Static fallback rates (updated 2026-02-07)
// Rates relative to USD
const FALLBACK_RATES: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 148.50,
    CNY: 7.24,
    INR: 83.12,
    MXN: 17.08,
    BRL: 4.87,
    CHF: 0.88,
    KRW: 1342.50,
    SGD: 1.34,
    NZD: 1.67,
    HKD: 7.81,
    NOK: 10.68,
    SEK: 10.37,
    DKK: 6.87,
    PLN: 4.03,
    THB: 34.52,
    MYR: 4.47,
    PHP: 56.15,
    IDR: 15892,
    AED: 3.67,
};

interface ExchangeRatesCache {
    rates: Record<string, number>;
    lastFetched: number;
}

let cache: ExchangeRatesCache | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch exchange rates from API with caching
 * Uses free exchangerate-api.com service
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
    // Check cache first
    if (cache && Date.now() - cache.lastFetched < CACHE_DURATION_MS) {
        return cache.rates;
    }

    try {
        // Use free tier API - no key required for basic usage
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

        if (!response.ok) {
            console.warn('Exchange rate API failed, using fallback rates');
            return FALLBACK_RATES;
        }

        const data = await response.json();

        if (data && data.rates) {
            cache = {
                rates: data.rates,
                lastFetched: Date.now(),
            };
            return data.rates;
        }

        return FALLBACK_RATES;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return FALLBACK_RATES;
    }
}

/**
 * Convert an amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code (e.g., "EUR")
 * @param toCurrency - Target currency code (e.g., "USD")
 * @returns Converted amount, or original amount if conversion fails
 */
export async function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
): Promise<number> {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    const rates = await fetchExchangeRates();

    const fromRate = rates[fromCurrency.toUpperCase()];
    const toRate = rates[toCurrency.toUpperCase()];

    if (!fromRate || !toRate) {
        console.warn(`Currency conversion not available for ${fromCurrency} to ${toCurrency}`);
        return amount;
    }

    // Convert to USD first, then to target currency
    const amountInUSD = amount / fromRate;
    return amountInUSD * toRate;
}

/**
 * Normalize flight prices to a common currency for comparison
 * @param flights - Array of flights with price and currency
 * @param targetCurrency - Currency to normalize to (defaults to USD)
 * @returns Flights with normalized prices
 */
export async function normalizePrices<T extends { price: number; currency: string }>(
    flights: T[],
    targetCurrency: string = 'USD'
): Promise<(T & { normalizedPrice: number; originalPrice: number; originalCurrency: string })[]> {
    const rates = await fetchExchangeRates();

    return flights.map(flight => {
        const fromRate = rates[flight.currency.toUpperCase()];
        const toRate = rates[targetCurrency.toUpperCase()];

        let normalizedPrice = flight.price;

        if (fromRate && toRate && flight.currency.toUpperCase() !== targetCurrency.toUpperCase()) {
            const priceInUSD = flight.price / fromRate;
            normalizedPrice = priceInUSD * toRate;
        }

        return {
            ...flight,
            normalizedPrice,
            originalPrice: flight.price,
            originalCurrency: flight.currency,
        };
    });
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(0)}`;
    }
}
