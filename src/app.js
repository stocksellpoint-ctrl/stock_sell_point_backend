import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import {
  errorHandler,
  notFoundHandler,
} from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();

  // ── Security ───────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );

  // ── Parsers ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Logging ────────────────────────────────────────────
  if (env.nodeEnv === 'development') {
    app.use(morgan('dev'));
  }

  // ── Rate limiting ──────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Routes ─────────────────────────────────────────────
  app.use('/api/v1', apiRoutes);

  // ── 404 + error handling ───────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}