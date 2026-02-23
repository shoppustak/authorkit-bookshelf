/**
 * GET /api/bookshelf/books
 *
 * Fetches books from the AuthorKit Bookshelf with optional filtering and pagination.
 * Used by the frontend to display books on bookshelf.authorkit.pro.
 *
 * Query parameters:
 * - genre: Filter by genre slug (e.g., "fantasy")
 * - search: Search by title or author name
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort: Sort order ("latest", "oldest", "title-asc", "title-desc")
 *
 * Example: /api/bookshelf/books?genre=fantasy&page=1&limit=20
 *
 * Response:
 * {
 *   "success": true,
 *   "books": [...],
 *   "pagination": {...},
 *   "stats": {...}
 * }
 */

import supabase, { formatSupabaseError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    const {
      genre,
      search,
      page = 1,
      limit = 20,
      sort = 'latest'
    } = req.query;

    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build the base query
    let query = supabase
      .from('bookshelf_books')
      .select(`
        id,
        title,
        slug,
        description,
        cover_medium,
        cover_large,
        author_name,
        author_bio,
        site_url,
        purchase_amazon_in,
        purchase_amazon_com,
        purchase_other,
        formats,
        rating,
        review_count,
        publication_date,
        synced_at,
        bookshelf_book_genres (
          genre_slug
        )
      `, { count: 'exact' });

    // Apply genre filter
    if (genre) {
      query = query.filter('bookshelf_book_genres.genre_slug', 'eq', genre);
    }

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,author_name.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        query = query.order('publication_date', { ascending: true });
        break;
      case 'title-asc':
        query = query.order('title', { ascending: true });
        break;
      case 'title-desc':
        query = query.order('title', { ascending: false });
        break;
      case 'latest':
      default:
        query = query.order('synced_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);

    // Execute query
    const { data: books, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json(formatSupabaseError(error));
    }

    // Format books data
    const formattedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      slug: book.slug,
      description: book.description,
      cover: {
        medium: book.cover_medium,
        large: book.cover_large
      },
      author: {
        name: book.author_name,
        bio: book.author_bio,
        site_url: book.site_url
      },
      genres: book.bookshelf_book_genres?.map(g => g.genre_slug) || [],
      purchase_links: {
        amazon_in: book.purchase_amazon_in,
        amazon_com: book.purchase_amazon_com,
        other: book.purchase_other
      },
      formats: book.formats ? JSON.parse(book.formats) : [],
      rating: book.rating,
      review_count: book.review_count,
      publication_date: book.publication_date,
      synced_at: book.synced_at
    }));

    // Get stats (total books and authors)
    const { count: totalBooks } = await supabase
      .from('bookshelf_books')
      .select('*', { count: 'exact', head: true });

    const { data: authorStats } = await supabase
      .from('bookshelf_books')
      .select('site_url')
      .limit(1000); // Reasonable limit for distinct count

    const uniqueAuthors = new Set(authorStats?.map(b => b.site_url) || []).size;

    // Calculate pagination
    const totalPages = Math.ceil((count || 0) / limitNum);

    // Success response
    return res.status(200).json({
      success: true,
      books: formattedBooks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        pages: totalPages
      },
      stats: {
        total_books: totalBooks || 0,
        total_authors: uniqueAuthors
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
