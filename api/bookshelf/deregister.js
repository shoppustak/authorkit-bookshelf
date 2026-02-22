/**
 * POST /api/bookshelf/deregister
 *
 * Deregisters a site from the AuthorKit Bookshelf.
 * Called when an author disables the Bookshelf feature in their plugin settings.
 * Removes all books from the site and marks the site as inactive.
 *
 * Request body:
 * {
 *   "site_url": "https://authorsite.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "books_removed": 12,
 *   "message": "Site deregistered successfully"
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
    const validationError = validatePayload(payload, ['site_url']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const { site_url } = payload;

    // First, count how many books will be removed
    const { count: bookCount, error: countError } = await supabase
      .from('bookshelf_books')
      .select('*', { count: 'exact', head: true })
      .eq('site_url', site_url);

    if (countError) {
      console.error('Count error:', countError);
      // Don't fail the request, just log it
    }

    // Delete all books from this site
    // Genres will be automatically deleted due to ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('bookshelf_books')
      .delete()
      .eq('site_url', site_url);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return res.status(500).json(formatSupabaseError(deleteError));
    }

    // Mark the site as inactive
    const { error: updateError } = await supabase
      .from('bookshelf_sites')
      .update({ active: false })
      .eq('site_url', site_url);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json(formatSupabaseError(updateError));
    }

    // Success response
    return res.status(200).json({
      success: true,
      books_removed: bookCount || 0,
      message: 'Site deregistered successfully'
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
