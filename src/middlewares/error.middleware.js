import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      error = ApiError.conflict(`Duplicate value for ${field}`);
    } else if (err.code === 'P2025') {
      error = ApiError.notFound('Record not found');
    } else if (err.code === 'P2003') {
      error = ApiError.badRequest('Foreign key constraint failed');
    } else {
      error = ApiError.badRequest(`Prisma error: ${err.code}`);
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    error = ApiError.badRequest('Prisma validation error');
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(
      err.statusCode || 500,
      err.message || 'Internal server error',
      err.errors || []
    );
  }

  logger.error(
    `${req.method} ${req.originalUrl} → ${error.statusCode}: ${error.message}`
  );

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
};