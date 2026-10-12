import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import {
  connectDatabase,
  disconnectDatabase,
} from './config/database.js';

async function bootstrap() {
  // Connect to MongoDB Atlas via Prisma
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`🚀 Server running on http://localhost:${env.port}`);
    logger.info(`   Environment: ${env.nodeEnv}`);
    logger.info(`   Health check: http://localhost:${env.port}/api/v1/health`);
  });

  // ── Graceful shutdown ──────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── Unhandled errors ───────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});