/**
 * Standardized error response utilities
 * Ensures consistent error format across all API endpoints
 */

/**
 * Standard error response format
 *
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for errors
 * @property {string} error - Human-readable error message
 * @property {string} [code] - Machine-readable error code (optional)
 * @property {Array<string>} [details] - Additional error details (optional)
 * @property {number} [retryAfter] - Seconds until retry allowed (rate limiting)
 */

/**
 * Error codes for different error types
 */
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',

  // Authentication/Authorization errors (401/403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Method errors (405)
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // Service errors (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * Create a standardized error response
 *
 * @param {string} message - Human-readable error message
 * @param {string} [code] - Error code from ERROR_CODES
 * @param {Array<string>} [details] - Additional error details
 * @param {Object} [extras] - Additional fields to include (e.g., retryAfter)
 * @returns {ErrorResponse}
 */
export function createErrorResponse(message, code = null, details = null, extras = {}) {
  const response = {
    success: false,
    error: message
  };

  if (code) {
    response.code = code;
  }

  if (details && details.length > 0) {
    response.details = details;
  }

  // Merge any extra fields (like retryAfter, field, etc.)
  return { ...response, ...extras };
}

/**
 * HTTP status code helpers
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Common error response generators
 */

export function validationError(message, details = null) {
  return createErrorResponse(
    message || 'Validation failed',
    ERROR_CODES.VALIDATION_ERROR,
    details
  );
}

export function missingFieldError(field) {
  return createErrorResponse(
    `Missing required field: ${field}`,
    ERROR_CODES.MISSING_REQUIRED_FIELD,
    null,
    { field }
  );
}

export function methodNotAllowedError(allowed = null) {
  const message = allowed
    ? `Method not allowed. Use: ${allowed}`
    : 'Method not allowed';

  return createErrorResponse(
    message,
    ERROR_CODES.METHOD_NOT_ALLOWED
  );
}

export function rateLimitError(retryAfter = null) {
  return createErrorResponse(
    'Too many requests. Please try again later.',
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    null,
    retryAfter ? { retryAfter } : {}
  );
}

export function notFoundError(resource = null) {
  const message = resource
    ? `${resource} not found`
    : 'Resource not found';

  return createErrorResponse(
    message,
    ERROR_CODES.NOT_FOUND
  );
}

export function internalError(isDevelopment = false, error = null) {
  const response = createErrorResponse(
    'Internal server error',
    ERROR_CODES.INTERNAL_ERROR
  );

  // In development, include error details
  if (isDevelopment && error) {
    response.message = error.message;
    response.stack = error.stack;
  }

  return response;
}

export function databaseError(isDevelopment = false, error = null) {
  const response = createErrorResponse(
    'Database error occurred',
    ERROR_CODES.DATABASE_ERROR
  );

  // In development, include error details
  if (isDevelopment && error) {
    response.message = error.message;
  }

  return response;
}

/**
 * Send standardized error response
 *
 * @param {Response} res - Express response object
 * @param {number} status - HTTP status code
 * @param {ErrorResponse} errorResponse - Error response object
 */
export function sendError(res, status, errorResponse) {
  return res.status(status).json(errorResponse);
}
