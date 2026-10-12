import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import {
  connectDatabase,
  disconnectDatabase,
} from './config/database.js';

// ────────────────────────────────────────────────────────────
// Cached app + connection for serverless (Vercel) reuse
// ────────────────────────────────────────────────────────────
let cachedApp = null;
let connectionPromise = null;

async function getApp() {
  // Reuse connection across warm invocations
  if (!connectionPromise) {
    connectionPromise = connectDatabase().catch((err) => {
      // Reset so the next request can retry
      connectionPromise = null;
      throw err;
    });
  }
  await connectionPromise;

  if (!cachedApp) {
    cachedApp = createApp();
  }
  return cachedApp;
}

// ────────────────────────────────────────────────────────────
// Vercel serverless entry point
// Vercel looks for a default export function
// ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    logger.error(`Handler error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: env.nodeEnv === 'development' ? err.message : undefined,
    });
  }
}

// ────────────────────────────────────────────────────────────
// Local development server (skipped on Vercel)
// Vercel sets the VERCEL env var automatically
// ────────────────────────────────────────────────────────────
const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  bootstrapLocal();
}

async function bootstrapLocal() {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(env.port, () => {
      logger.info(`🚀 Server running on http://localhost:${env.port}`);
      logger.info(`   Environment: ${env.nodeEnv}`);
      logger.info(`   Health check: http://localhost:${env.port}/api/v1/health`);
    });

    // ── Graceful shutdown (local only) ───────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled Rejection: ${reason}`);
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      shutdown('uncaughtException');
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}












// async function bootstrap() {
//   // Connect to MongoDB Atlas via Prisma
//   await connectDatabase();

//   const app = createApp();

//   const server = app.listen(env.port, () => {
//     logger.info(`🚀 Server running on http://localhost:${env.port}`);
//     logger.info(`   Environment: ${env.nodeEnv}`);
//     logger.info(`   Health check: http://localhost:${env.port}/api/v1/health`);
//   });

//   // ── Graceful shutdown ──────────────────────────────────
//   const shutdown = async (signal) => {
//     logger.info(`${signal} received, shutting down gracefully...`);

//     server.close(async () => {
//       await disconnectDatabase();
//       logger.info('Server closed');
//       process.exit(0);
//     });

//     // Force exit after 10s
//     setTimeout(() => {
//       logger.error('Forced shutdown after timeout');
//       process.exit(1);
//     }, 10_000);
//   };

//   process.on('SIGINT', () => shutdown('SIGINT'));
//   process.on('SIGTERM', () => shutdown('SIGTERM'));

//   // ── Unhandled errors ───────────────────────────────────
//   process.on('unhandledRejection', (reason) => {
//     logger.error(`Unhandled Rejection: ${reason}`);
//     shutdown('unhandledRejection');
//   });

//   process.on('uncaughtException', (err) => {
//     logger.error(`Uncaught Exception: ${err.message}`);
//     shutdown('uncaughtException');
//   });
// }

// bootstrap().catch((err) => {
//   console.error('Fatal startup error:', err);
//   process.exit(1);
// });