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

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : true,
      exposedHeaders: ['Content-Range'],
      credentials: true,
    }),
  );

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'backend-namanpuja' }));

  // Public API (rate-limited)
  const publicLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true });
  app.use('/api', publicLimiter, publicRouter);

  // Admin API (stricter limiter on the auth surface handled within)
  const adminLimiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true });
  app.use('/api/admin', adminLimiter, adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
