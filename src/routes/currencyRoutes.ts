import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getLiveRates,
  detectLocationFromIP,
  detectLocationFromCoords,
  getCurrencyForCountry,
  COUNTRY_CURRENCY_MAP,
} from '../services/currencyService.js';

export const currencyRouter = Router();

// GET /api/currency/rates - Returns live rates relative to 1 INR and supported currencies
currencyRouter.get(
  '/rates',
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await getLiveRates();
    res.json({
      base: 'INR',
      timestamp: data.timestamp,
      source: data.source,
      rates: data.rates,
    });
  }),
);

// GET /api/currency/detect - Detects user's country & currency from IP
currencyRouter.get(
  '/detect',
  asyncHandler(async (req: Request, res: Response) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '';
    const location = await detectLocationFromIP(ip);
    res.json(location);
  }),
);

// POST /api/currency/detect-coords - Detects user's country & currency from GPS Coordinates
currencyRouter.post(
  '/detect-coords',
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lon } = req.body || {};
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude numbers are required' });
    }
    const location = await detectLocationFromCoords(lat, lon);
    res.json(location);
  }),
);

// GET /api/currency/config/:country - Resolves currency config for a given country name or code
currencyRouter.get(
  '/config/:country',
  asyncHandler(async (req: Request, res: Response) => {
    const config = getCurrencyForCountry(req.params.country);
    res.json(config);
  }),
);

// GET /api/currency/countries - Returns list of unique supported countries and currencies
currencyRouter.get(
  '/countries',
  asyncHandler(async (_req: Request, res: Response) => {
    const seen = new Set<string>();
    const list = Object.values(COUNTRY_CURRENCY_MAP).filter((item) => {
      if (seen.has(item.countryName)) return false;
      seen.add(item.countryName);
      return true;
    });
    res.json(list);
  }),
);
