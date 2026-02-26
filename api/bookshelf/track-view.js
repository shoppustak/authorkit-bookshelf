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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { book_id } = req.body;

    // Validate book_id
    if (!book_id || isNaN(parseInt(book_id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid book_id. Must be a number.'
      });
    }

    const bookId = parseInt(book_id);

    // Insert view record
    const { error } = await supabase
      .from('bookshelf_book_views')
      .insert({
        book_id: bookId
      });

    if (error) {
      console.error('Failed to track view:', formatSupabaseError(error));
      // Don't fail the request if tracking fails
      return res.status(200).json({
        success: true,
        tracked: false
      });
    }

    return res.status(200).json({
      success: true,
      tracked: true
    });

  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't fail the request if tracking fails
    return res.status(200).json({
      success: true,
      tracked: false
    });
  }
}
