/**
 * POST /api/bookshelf/sync
 *
 * Syncs a book from a WordPress site to the AuthorKit Bookshelf.
 * Called when an author saves a book with the "Include in Bookshelf" checkbox enabled.
 *
 * Request body: Full book payload (22 fields per RFC)
 *
 * Response:
 * {
 *   "success": true,
 *   "book_id": 456,
 *   "message": "Book synced successfully"
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
    const validationError = validatePayload(payload, [
      'site_url',
      'site_name',
      'book_post_id',
      'title'
    ]);

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // First, ensure the site is registered
    const { error: siteError } = await supabase
      .from('bookshelf_sites')
      .upsert(
        {
          site_url: payload.site_url,
          site_name: payload.site_name,
          active: true
        },
        {
          onConflict: 'site_url'
        }
      );

    if (siteError) {
      console.error('Site registration error:', siteError);
      return res.status(500).json(formatSupabaseError(siteError));
    }

    // Prepare book data for database
    const bookData = {
      site_url: payload.site_url,
      book_post_id: payload.book_post_id,
      title: payload.title,
      slug: payload.slug || '',
      description: payload.description || '',
      cover_thumbnail: payload.cover?.thumbnail || '',
      cover_medium: payload.cover?.medium || '',
      cover_large: payload.cover?.large || '',
      cover_full: payload.cover?.full || '',
      author_name: payload.author || '',
      author_bio: payload.author_bio || '',
      author_website: payload.author_website || '',
      author_twitter: payload.author_twitter || '',
      author_instagram: payload.author_instagram || '',
      purchase_amazon_in: payload.purchase_links?.amazon_in || '',
      purchase_amazon_com: payload.purchase_links?.amazon_com || '',
      purchase_other: payload.purchase_links?.other || '',
      local_categories: JSON.stringify(payload.local_categories || []),
      formats: JSON.stringify(payload.formats || []),
      isbn: payload.isbn || '',
      rating: payload.rating || null,
      review_count: payload.review_count || null,
      publication_date: payload.publication_date || null,
      synced_at: new Date().toISOString()
    };

    // Upsert book record
    const { data: bookRecord, error: bookError } = await supabase
      .from('bookshelf_books')
      .upsert(bookData, {
        onConflict: 'site_url,book_post_id',
        returning: 'representation'
      })
      .select()
      .single();

    if (bookError) {
      console.error('Book upsert error:', bookError);
      return res.status(500).json(formatSupabaseError(bookError));
    }

    const bookId = bookRecord.id;

    // Handle genres: delete old ones, insert new ones
    // First, delete existing genre associations
    await supabase
      .from('bookshelf_book_genres')
      .delete()
      .eq('book_id', bookId);

    // Insert new genre associations
    if (payload.bookshelf_genres && payload.bookshelf_genres.length > 0) {
      const genreRecords = payload.bookshelf_genres
        .filter(genre => genre) // Filter out empty values
        .slice(0, 2) // Max 2 genres
        .map(genre => ({
          book_id: bookId,
          genre_slug: genre
        }));

      if (genreRecords.length > 0) {
        const { error: genreError } = await supabase
          .from('bookshelf_book_genres')
          .insert(genreRecords);

        if (genreError) {
          console.error('Genre insert error:', genreError);
          // Don't fail the whole request if genre insert fails
          // The book is already saved
        }
      }
    }

    // Success response
    return res.status(200).json({
      success: true,
      book_id: bookId,
      message: 'Book synced successfully'
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
