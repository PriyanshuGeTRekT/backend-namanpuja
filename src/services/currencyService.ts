import axios from 'axios';
import countries from 'world-countries';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  countryName: string;
  flagEmoji?: string;
}

// Built once at module load from world-countries dataset — covers every ISO country,
// no manual typing, no missing entries.
export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyConfig> = {};
const COUNTRY_NAME_TO_KEY: Record<string, string> = {};

for (const c of countries) {
  const alpha2 = c.cca2.toLowerCase();
  const currencyEntries = Object.entries(c.currencies || {});
  if (currencyEntries.length === 0) continue;

  const [code, info] = currencyEntries[0] as [string, { name: string; symbol?: string }];

  const config: CurrencyConfig = {
    code,
    symbol: info.symbol || code,
    name: info.name,
    countryName: c.name.common,
    flagEmoji: c.flag,
  };

  COUNTRY_CURRENCY_MAP[alpha2] = config;
  COUNTRY_NAME_TO_KEY[c.name.common.toLowerCase()] = alpha2;

  // also index common alt names so "usa", "uk" style lookups keep working
  for (const altName of c.altSpellings || []) {
    const key = altName.toLowerCase();
    if (!COUNTRY_NAME_TO_KEY[key]) COUNTRY_NAME_TO_KEY[key] = alpha2;
  }
}

const DEFAULT_CURRENCY: CurrencyConfig = COUNTRY_CURRENCY_MAP.in;

// Fallback rates against INR if external API is unreachable
const FALLBACK_INR_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  GBP: 0.0095,
  CAD: 0.016,
  AUD: 0.018,
  OMR: 0.0046,
  AED: 0.044,
  EUR: 0.011,
  SGD: 0.016,
  NPR: 1.6,
  JPY: 1.8,
  SAR: 0.045,
  QAR: 0.044,
  KWD: 0.0037,
  NZD: 0.02,
  ZAR: 0.22,
  MYR: 0.055,
};

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

let cachedRatesData: CachedRates | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches latest exchange rates for 1 INR to all world currencies using Axios
 */
export async function getLiveRates(): Promise<{ rates: Record<string, number>; timestamp: number; source: string }> {
  const now = Date.now();
  if (cachedRatesData && now - cachedRatesData.timestamp < CACHE_TTL_MS) {
    return { rates: cachedRatesData.rates, timestamp: cachedRatesData.timestamp, source: 'cache' };
  }

  // Try Open ER-API first
  try {
    const res = await axios.get('https://open.er-api.com/v6/latest/INR', { timeout: 4000 });
    if (res.data && res.data.rates) {
      cachedRatesData = {
        rates: res.data.rates,
        timestamp: now,
      };
      return { rates: res.data.rates, timestamp: now, source: 'live-erapi' };
    }
  } catch (err: any) {
    console.warn('Primary Currency API failed, trying fallback currency API...', err?.message);
  }

  // Fallback API 2: jsdelivr Fawaz Ahmed currency API
  try {
    const res2 = await axios.get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json', {
      timeout: 4000,
    });
    if (res2.data && res2.data.inr) {
      const formattedRates: Record<string, number> = {};
      for (const [key, value] of Object.entries(res2.data.inr)) {
        formattedRates[key.toUpperCase()] = Number(value);
      }
      cachedRatesData = {
        rates: formattedRates,
        timestamp: now,
      };
      return { rates: formattedRates, timestamp: now, source: 'live-jsdelivr' };
    }
  } catch (err2: any) {
    console.warn('Secondary Currency API failed, using static fallback rates', err2?.message);
  }

  return { rates: cachedRatesData?.rates || FALLBACK_INR_RATES, timestamp: now, source: 'fallback' };
}

/**
 * Resolves country code OR country name to currency configuration.
 * Backed by the world-countries dataset — works for any real country,
 * not just the handful that used to be hardcoded.
 */
export function getCurrencyForCountry(countryOrCode: string): CurrencyConfig {
  if (!countryOrCode) return DEFAULT_CURRENCY;
  const key = countryOrCode.trim().toLowerCase();

  // direct 2-letter code match
  if (COUNTRY_CURRENCY_MAP[key]) {
    return COUNTRY_CURRENCY_MAP[key];
  }

  // full country name / alt-spelling match
  const codeFromName = COUNTRY_NAME_TO_KEY[key];
  if (codeFromName && COUNTRY_CURRENCY_MAP[codeFromName]) {
    return COUNTRY_CURRENCY_MAP[codeFromName];
  }

  // genuinely unrecognized input — last-resort fallback only
  return {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    countryName: countryOrCode,
    flagEmoji: '🌐',
  };
}

/**
 * Detects country and currency from client IP using Axios
 */
export async function detectLocationFromIP(ip: string): Promise<{
  countryCode: string;
  countryName: string;
  currency: CurrencyConfig;
}> {
  const cleanIp = ip.replace(/^.*:/, '').trim(); // Strip IPv6 prefix if mapped IPv4

  // If local / private IP, return default India
  if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === 'localhost' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
    return {
      countryCode: 'IN',
      countryName: 'India',
      currency: DEFAULT_CURRENCY,
    };
  }

  try {
    const response = await axios.get(`https://ipapi.co/${cleanIp}/json/`, { timeout: 3000 });
    const data = response.data;
    if (data && data.country_code) {
      const countryName = data.country_name || 'India';
      const baseConfig = getCurrencyForCountry(data.country_code);

      // ipapi.co often returns the currency code directly — prefer it when present,
      // but keep symbol/flag from our dataset since ipapi.co doesn't provide those.
      const currency: CurrencyConfig = data.currency
        ? {
            code: data.currency,
            symbol: baseConfig.symbol,
            name: data.currency_name || baseConfig.name,
            countryName,
            flagEmoji: baseConfig.flagEmoji,
          }
        : baseConfig;

      return {
        countryCode: data.country_code,
        countryName,
        currency,
      };
    }
   } catch (err: any) {
    console.error('[detectLocationFromIP] ipapi.co failed:', err?.response?.status, err?.message);
    try {
      const res2 = await axios.get(`http://ip-api.com/json/${cleanIp}`, { timeout: 3000 });
      if (res2.data && res2.data.countryCode) {
        const countryName = res2.data.country || 'India';
        const config = getCurrencyForCountry(res2.data.countryCode);
        return {
          countryCode: res2.data.countryCode,
          countryName,
          currency: config,
        };
      }
    } catch (err2: any) {
      console.error('[detectLocationFromIP] ip-api.com failed:', err2?.response?.status, err2?.message);
    }
  }

  return {
    countryCode: 'IN',
    countryName: 'India',
    currency: DEFAULT_CURRENCY,
  };
}

/**
 * Reverse geocodes latitude/longitude coordinates to country and currency
 */
export async function detectLocationFromCoords(lat: number, lon: number): Promise<{
  countryCode: string;
  countryName: string;
  currency: CurrencyConfig;
}> {
  try {
    const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'NamanPujaLocationService/1.0' },
      timeout: 3000,
    });
    if (res.data && res.data.address && res.data.address.country_code) {
      const code = res.data.address.country_code.toLowerCase();
      const countryName = res.data.address.country || 'India';
      const config = getCurrencyForCountry(code);
      return {
        countryCode: code.toUpperCase(),
        countryName,
        currency: config,
      };
    }
  } catch {
    // Ignore and fallback
  }

  return {
    countryCode: 'IN',
    countryName: 'India',
    currency: DEFAULT_CURRENCY,
  };
}