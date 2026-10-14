import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`,'ROUTE_NOT_FOUND'));
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      error = ApiError.conflict(`Duplicate value for ${field}`,'DUPLICATE_VALUE');
    } else if (err.code === 'P2025') {
      error = ApiError.notFound('Record not found','RECORD_NOT_FOUND');
    } else if (err.code === 'P2003') {
      error = ApiError.badRequest('Foreign key constraint failed','FOREIGN_KEY_FAILED');
    } else {
      error = ApiError.badRequest(`Prisma error: ${err.code}`,'PRISMA_ERROR');
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Prisma puts the real cause in err.message - log it and pass it
    // through so you can see exactly what field is wrong.
    console.error('PRISMA VALIDATION', err.message);
    error = ApiError.badRequest(
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Invalid data provided. Please check all fields',
        'PRISMA_VALIDATION'
    );
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(
      err.statusCode || 500,
      err.message || 'Internal server error',  // never leak internals to the client
      err.errors || [],
      err.code || _defaultCodeFor(err.statusCode || 500)
    );
  }

  logger.error(
    `${req.method} ${req.originalUrl} → ${error.statusCode} [$error.code || 'NO_CODE']: ${error.message}`
  );

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    code:error.code || _defaultCodeFor(error.statusCode),
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
};

/**
 * Assigns a default machine-readable code when none was provided.
 * Keeps the response shape consistent — every error has a `code`.
 */
function _defaultCodeFor(statusCode) {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'ERROR';
  }
}