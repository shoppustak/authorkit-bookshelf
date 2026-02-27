/**
 * Security utilities for Bookshelf API endpoints
 */

// In-memory rate limiting (simple implementation for serverless)
const rateLimitStore = new Map();

/**
 * Set CORS headers
 * Allows requests from authorkit.pro and any WordPress site
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  // Allow requests from authorkit.pro domain and WordPress sites
  if (origin && (
    origin.includes('authorkit.pro') ||
    origin.includes('localhost') ||
    req.headers['user-agent']?.includes('WordPress')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Default: allow all (since bookshelf is a public catalog)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

/**
 * Set security headers
 */
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Simple rate limiting
 * @param {string} identifier - IP address or other unique identifier
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{allowed: boolean, retryAfter: number}}
 */
export function rateLimit(identifier, maxRequests, windowMs) {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / windowMs)}`;

  let requestCount = rateLimitStore.get(key) || 0;
  requestCount++;

  rateLimitStore.set(key, requestCount);

  // Clean up old entries (prevent memory leak)
  if (rateLimitStore.size > 10000) {
    const oldestKey = rateLimitStore.keys().next().value;
    rateLimitStore.delete(oldestKey);
  }

  const allowed = requestCount <= maxRequests;
  const retryAfter = allowed ? 0 : Math.ceil(windowMs / 1000);

  return {
    allowed,
    retryAfter,
    remaining: Math.max(0, maxRequests - requestCount)
  };
}

/**
 * Get client IP address
 */
export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
}

/**
 * Validate input data
 */
export function validateInput(data, schema) {
  const errors = [];
  const sanitized = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // If not required and no value, skip
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${field} must be a string`);
            continue;
          }
          break;
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`${field} must be a number`);
            continue;
          }
          sanitized[field] = Number(value);
          continue;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${field} must be a boolean`);
            continue;
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${field} must be an array`);
            continue;
          }
          break;
      }
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }

      // Trim whitespace
      sanitized[field] = value.trim();
    } else {
      sanitized[field] = value;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: sanitized
  };
}
