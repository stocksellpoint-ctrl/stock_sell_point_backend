import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from './logger.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.nodeEnv === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Prisma connected to MongoDB');
  } catch (err) {
    logger.error(`❌ Prisma connection failed: ${err.message}`);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}