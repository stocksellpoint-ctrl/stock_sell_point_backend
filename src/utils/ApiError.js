export class ApiError extends Error {
  constructor(statusCode, message, errors = [], code = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', code = "BAD_REQUEST", errors = []) {
    return new ApiError(400, msg, errors, code);
  }
  static unauthorized(msg = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(401, msg, code);
  }
  static invalidCredential(msg = 'Invalid credentials', code = 'INVALID CREDENTIAL') {
    return new ApiError(401, msg, code);
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
  static notFound(msg = 'Not found' ,code = 'NOT_FOUND') {
    return new ApiError(404, msg, code);
  }
  static conflict(msg = 'Conflict', code = 'CONFLICT') {
    return new ApiError(409, msg, code);
  }
  static internal(msg = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ApiError(500, msg, code);
  }
  static unavailable(msg = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, msg, code);
  }
}