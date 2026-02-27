/**
 * POST /api/bookshelf/track-view
 *
 * Tracks a book view for analytics.
 * Called when a book card becomes visible in the viewport.
 *
 * Request body:
 * {
 *   "book_id": 123
 * }
 *
 * Response:
 * {
 *   "success": true
 * }
 */

import supabase, { formatSupabaseError } from '../_lib/supabase.js';
import { setCorsHeaders, setSecurityHeaders, rateLimit, getClientIp, validateInput } from '../_lib/security.js';
import { methodNotAllowedError, rateLimitError, validationError, internalError, HTTP_STATUS } from '../_lib/errors.js';
import logger from '../_lib/logger.js';

export default async function handler(req, res) {
  // Set CORS and security headers
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(
      methodNotAllowedError('POST')
    );
  }

  // Rate limiting - 100 requests per hour per IP
  const clientIp = getClientIp(req);
  const rateLimitResult = rateLimit(clientIp, 100, 3600000); // 100 req/hour

  if (!rateLimitResult.allowed) {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(
      rateLimitError(rateLimitResult.retryAfter)
    );
  }

  try {
    // Validate input using validateInput utility
    const validation = validateInput(req.body, {
      book_id: {
        required: true,
        type: 'number'
      }
    });

    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationError('Validation failed', validation.errors)
      );
    }

    const bookId = validation.data.book_id;

    // Additional validation: book_id must be positive
    if (bookId <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationError('book_id must be a positive number')
      );
    }

    // Insert view record
    const { error } = await supabase
      .from('bookshelf_book_views')
      .insert({
        book_id: bookId
      });

    if (error) {
      logger.error('Failed to track view', error);
      // Don't fail the request if tracking fails
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        tracked: false
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      tracked: true
    });

  } catch (error) {
    logger.error('Error tracking view', error);
    const isDevelopment = process.env.NODE_ENV === 'development';
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(
      internalError(isDevelopment, error)
    );
  }
}
