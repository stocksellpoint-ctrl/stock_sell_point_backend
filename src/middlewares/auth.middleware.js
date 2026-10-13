import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or invalid Authorization header','MISSING_TOKEN');
    }

    const payload = jwt.verify(token, env.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is inactive', 'USER_INACTIVE');
    }

    const { password, ...safe } = user;
    req.user = safe;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError')
      return next(ApiError.unauthorized('Invalid token', 'INVALID_TOKEN'));
    if (err.name === 'TokenExpiredError')
      return next(ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED'));
    if (err.name === 'NotBeforeError')
      return next(ApiError.unauthorized('Token not yet valid', 'TOKEN_NOT_ACTIVE'));
    
    // ── Anything else bubbles up ────────────────────────
    next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'NOT_AUTHENTICATED'));
  }

  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required', 'ADMIN_REQUIRED'));
  }
  next();
};