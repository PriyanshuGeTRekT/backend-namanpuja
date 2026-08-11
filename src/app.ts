import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { publicRouter } from './public/index.js';
import { adminRouter } from './admin/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { buildSitemapXml } from './utils/sitemap.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xFrameOptions: { action: 'sameorigin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
    }),
  );

  // Security Headers Middleware Guard (Guarantees headers on all responses)
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // --- CORS ---
  // Static allowlist for known, stable origins (local dev + production domains).
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://www.namanpuja.com',
    'https://namanpuja.com',
    'https://naman-puja-admin-panel.vercel.app',
    'https://naman-puja-admin-panel-tr63876wc-naman-puja.vercel.app',
    ...env.corsOrigins.map((o) => o.replace(/\/$/, '')),
  ];

  // Match any Vercel preview or production deployment for our admin/frontend apps
  const vercelPreviewPattern = /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/;

  app.use(
    cors({
      origin: (origin, callback) => {
        // No origin header = same-origin request, server-to-server call, curl, etc. — allow.
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/$/, '');

        if (allowedOrigins.includes(cleanOrigin) || vercelPreviewPattern.test(cleanOrigin)) {
          return callback(null, true);
        }

        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      exposedHeaders: ['Content-Range'],
      credentials: true,
    }),
  );

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'backend-namanpuja' }));

  // Public API (rate-limited)
  const publicLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true });
  app.use('/api', publicLimiter, publicRouter);
  app.use('/', publicLimiter, publicRouter);

  // Admin API (stricter limiter on the auth surface handled within)
  const adminLimiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true });
  app.use('/api/admin', adminLimiter, adminRouter);

  // Sitemap route at the root level before 404/catch-all handlers
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const xml = await buildSitemapXml();
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      res.status(500).send('Error generating sitemap');
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}