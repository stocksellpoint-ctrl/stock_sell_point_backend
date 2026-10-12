import dotenv from 'dotenv';
dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  const msg = `❌ Missing required env vars: ${missing.join(', ')}`;
  console.error(msg);
  // Only exit in local dev — Vercel handles missing env via its own mechanism
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  } else {
    throw new Error(msg);
  }
}

// for (const key of required) {
//   if (!process.env[key]) {
//     console.error(`❌ Missing required env var: ${key}`);
//     process.exit(1);
//   }
// }

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  corsOrigin: (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim()),

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};