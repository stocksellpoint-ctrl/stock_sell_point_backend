export class ApiError extends Error {
  constructor(statusCode, message, errors = [], code = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── 400 Bad Request ─────────────────────────────────────
  static badRequest(msg = 'Bad request', code = "BAD_REQUEST", errors = []) {
    return new ApiError(400, msg, errors, code);
  }
  // ── 401 Unauthorized ────────────────────────────────────
  static unauthorized(msg = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(401, msg, code);
  }
  static invalidCredential(msg = 'Invalid credentials', code = 'INVALID_CREDENTIALS') {
    return new ApiError(401, msg, code);
  }

  static invalidToken(msg = 'Invalid token', code = 'INVALID_TOKEN') {
    return new ApiError(401, msg, [], code);
  }

  static tokenExpired(msg = 'Token expired', code = 'TOKEN_EXPIRED') {
    return new ApiError(401, msg, [], code);
  }

  static missingToken(msg = 'Missing Authorization header', code = 'MISSING_TOKEN') {
    return new ApiError(401, msg, [], code);
  }

  static methodNotAllowed(msg = 'Method not allowed', code = 'MOTHOD_NOT_ALLOWED') {
    return new ApiError(405, msg, code);
  }
  static unprocessable(msg = 'Validation failed', code = 'VALIDATION_ERROR', errors = []){
    return new ApiError(422, msg, errors, code)
  }
  static tooManyRequests(msg = 'Too many requrests', code = 'RATE_LIMITED') {
    return new ApiError(429, msg, code);
  }
  static forbidden(msg = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, msg, code);
  }

  static adminRequired(msg = 'Admin access required', code = 'ADMIN_REQUIRED') {
    return new ApiError(403, msg, [], code);
  }

  // ── 404 Not Found ───────────────────────────────────────
  static notFound(msg = 'Not found' ,code = 'NOT_FOUND') {
    return new ApiError(404, msg, code);
  }
  static userNotFound(msg = 'User not found', code = 'USER_NOT_FOUND') {
    return new ApiError(404, msg, [], code);
  }

  static recordNotFound(msg = 'Record not found', code = 'RECORD_NOT_FOUND') {
    return new ApiError(404, msg, [], code);
  }

  // ── 409 Conflict ────────────────────────────────────────
  static conflict(msg = 'Conflict', code = 'CONFLICT') {
    return new ApiError(409, msg, code);
  }
  static duplicateValue(msg = 'Duplicate value', code = 'DUPLICATE_VALUE') {
    return new ApiError(409, msg, [], code);
  }

  static emailAlreadyRegistered(
    msg = 'Email already registered',
    code = 'EMAIL_ALREADY_REGISTERED'
  ) {
    return new ApiError(409, msg, [], code);
  }

  // ── 500 Internal Server Error ───────────────────────────
  static internal(msg = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ApiError(500, msg, code);
  }
  static unavailable(msg = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, msg, code);
  }
}