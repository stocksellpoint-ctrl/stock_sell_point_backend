import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or invalid Authorization header');
    }

    const payload = jwt.verify(token, env.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) throw ApiError.unauthorized('User inactive');

    const { password, ...safe } = user;
    req.user = safe;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError')
      return next(ApiError.unauthorized('Invalid token'));
    if (err.name === 'TokenExpiredError')
      return next(ApiError.unauthorized('Token expired'));
    next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required'));
  }
  next();
};