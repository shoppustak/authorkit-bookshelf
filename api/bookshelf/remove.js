/**
 * POST /api/bookshelf/remove
 *
 * Removes a single book from the AuthorKit Bookshelf.
 * Called when an author unchecks the "Include in Bookshelf" checkbox.
 *
 * Request body:
 * {
 *   "site_url": "https://authorsite.com",
 *   "book_post_id": 42
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Book removed successfully"
 * }
 */

import supabase, { formatSupabaseError, validatePayload } from '../_lib/supabase.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const payload = req.body;

    // Validate required fields
    const validationError = validatePayload(payload, ['site_url', 'book_post_id']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const { site_url, book_post_id } = payload;

    // Delete the book record
    // Genres will be automatically deleted due to ON DELETE CASCADE
    const { error } = await supabase
      .from('bookshelf_books')
      .delete()
      .eq('site_url', site_url)
      .eq('book_post_id', book_post_id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json(formatSupabaseError(error));
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Book removed successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
