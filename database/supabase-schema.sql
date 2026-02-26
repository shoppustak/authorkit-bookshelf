-- AuthorKit Bookshelf Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- ============================================================================
-- Table: bookshelf_sites
-- Stores sites that have opted into the Bookshelf
-- ============================================================================
CREATE TABLE bookshelf_sites (
  id SERIAL PRIMARY KEY,
  site_url TEXT UNIQUE NOT NULL,
  site_name TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- Table: bookshelf_books
-- Stores book data synced from WordPress sites
-- ============================================================================
CREATE TABLE bookshelf_books (
  id SERIAL PRIMARY KEY,
  site_url TEXT NOT NULL REFERENCES bookshelf_sites(site_url) ON DELETE CASCADE,
  book_post_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  cover_thumbnail TEXT,
  cover_medium TEXT,
  cover_large TEXT,
  cover_full TEXT,
  author_name TEXT,
  author_bio TEXT,
  author_website TEXT,
  author_twitter TEXT,
  author_instagram TEXT,
  purchase_amazon_in TEXT,
  purchase_amazon_com TEXT,
  purchase_other TEXT,
  local_categories TEXT, -- JSON array stored as text
  formats TEXT,          -- JSON array stored as text
  isbn TEXT,
  rating NUMERIC(3,1),
  review_count INTEGER,
  publication_date DATE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_url, book_post_id)
);

-- ============================================================================
-- Table: bookshelf_book_genres
-- Junction table for many-to-many book-genre relationship
-- ============================================================================
CREATE TABLE bookshelf_book_genres (
  book_id INTEGER REFERENCES bookshelf_books(id) ON DELETE CASCADE,
  genre_slug TEXT NOT NULL,
  PRIMARY KEY (book_id, genre_slug)
);

-- ============================================================================
-- Table: bookshelf_genre_requests
-- Logs requests for new genres from authors
-- ============================================================================
CREATE TABLE bookshelf_genre_requests (
  id SERIAL PRIMARY KEY,
  site_url TEXT,
  genre_label TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX idx_books_site_url ON bookshelf_books(site_url);
CREATE INDEX idx_books_publication_date ON bookshelf_books(publication_date DESC);
CREATE INDEX idx_books_synced_at ON bookshelf_books(synced_at DESC);
CREATE INDEX idx_book_genres_genre_slug ON bookshelf_book_genres(genre_slug);
CREATE INDEX idx_sites_active ON bookshelf_sites(active) WHERE active = true;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE bookshelf_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookshelf_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookshelf_book_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookshelf_genre_requests ENABLE ROW LEVEL SECURITY;

-- Public read access for sites (only active sites)
CREATE POLICY "Public read active sites"
  ON bookshelf_sites FOR SELECT
  USING (active = true);

-- Public read access for books
CREATE POLICY "Public read books"
  ON bookshelf_books FOR SELECT
  USING (true);

-- Public read access for book genres
CREATE POLICY "Public read book genres"
  ON bookshelf_book_genres FOR SELECT
  USING (true);

-- Service role can do everything (these policies are for the authenticated service role key)
CREATE POLICY "Service role full access to sites"
  ON bookshelf_sites FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to books"
  ON bookshelf_books FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to book genres"
  ON bookshelf_book_genres FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to genre requests"
  ON bookshelf_genre_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Sample Queries (for testing)
-- ============================================================================

-- Get all books with their genres
-- SELECT
--   b.id,
--   b.title,
--   b.author_name,
--   b.site_url,
--   array_agg(bg.genre_slug) as genres
-- FROM bookshelf_books b
-- LEFT JOIN bookshelf_book_genres bg ON b.id = bg.book_id
-- GROUP BY b.id
-- ORDER BY b.synced_at DESC
-- LIMIT 20;

-- Get books by genre
-- SELECT
--   b.id,
--   b.title,
--   b.author_name,
--   b.cover_medium
-- FROM bookshelf_books b
-- INNER JOIN bookshelf_book_genres bg ON b.id = bg.book_id
-- WHERE bg.genre_slug = 'fantasy'
-- ORDER BY b.publication_date DESC
-- LIMIT 20;

-- Get stats
-- SELECT
--   COUNT(DISTINCT b.id) as total_books,
--   COUNT(DISTINCT b.site_url) as total_authors,
--   COUNT(DISTINCT bg.genre_slug) as genres_used
-- FROM bookshelf_books b
-- LEFT JOIN bookshelf_book_genres bg ON b.id = bg.book_id;

-- ============================================================================
-- Table: bookshelf_book_views
-- Tracks book views for analytics (simple counter)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookshelf_book_views (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES bookshelf_books(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast view count queries
CREATE INDEX IF NOT EXISTS idx_book_views_book_id ON bookshelf_book_views(book_id);
CREATE INDEX IF NOT EXISTS idx_book_views_viewed_at ON bookshelf_book_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE bookshelf_book_views ENABLE ROW LEVEL SECURITY;

-- Public can insert views (anonymous tracking)
CREATE POLICY "Public can insert views"
  ON bookshelf_book_views FOR INSERT
  WITH CHECK (true);

-- Service role can read all views
CREATE POLICY "Service role read views"
  ON bookshelf_book_views FOR SELECT
  USING (true);

-- Create materialized view for fast view counts (optional, for performance)
-- This can be refreshed periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS bookshelf_book_view_counts AS
SELECT
  book_id,
  COUNT(*) as view_count
FROM bookshelf_book_views
GROUP BY book_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_view_counts_book_id
  ON bookshelf_book_view_counts(book_id);

-- Refresh function (can be called by cron job)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_book_view_counts;
