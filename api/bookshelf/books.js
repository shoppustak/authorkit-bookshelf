/**
 * GET /api/bookshelf/books
 *
 * Fetches books from the AuthorKit Bookshelf.
 * For now, returns empty data - will be connected to database later.
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    // Return empty data for now
    // TODO: Connect to Supabase or database
    return res.status(200).json({
      success: true,
      books: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      },
      stats: {
        total_books: 0,
        total_authors: 0
      }
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
