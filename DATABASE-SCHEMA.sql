-- ============================================================================
-- AuthorKit Bookshelf Database Schema
-- Complete database setup for bookshelf.authorkit.pro
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Tables
-- ============================================================================

-- Table: bookshelf_sites
-- Stores WordPress sites that have registered with the bookshelf
CREATE TABLE IF NOT EXISTS bookshelf_sites (
    id BIGSERIAL PRIMARY KEY,
    site_url TEXT NOT NULL UNIQUE,
    site_name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bookshelf_books
-- Stores all books synced from WordPress sites
CREATE TABLE IF NOT EXISTS bookshelf_books (
    id BIGSERIAL PRIMARY KEY,
    site_url TEXT NOT NULL,
    book_post_id BIGINT NOT NULL,
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
    local_categories JSONB DEFAULT '[]'::jsonb,
    formats JSONB DEFAULT '[]'::jsonb,
    isbn TEXT,
    rating NUMERIC(3,2),
    review_count INTEGER,
    publication_date DATE,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_url, book_post_id)
);

-- Table: bookshelf_book_genres
-- Many-to-many relationship between books and genres
CREATE TABLE IF NOT EXISTS bookshelf_book_genres (
    id BIGSERIAL PRIMARY KEY,
    book_id BIGINT NOT NULL REFERENCES bookshelf_books(id) ON DELETE CASCADE,
    genre_slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(book_id, genre_slug)
);

-- Table: bookshelf_book_views
-- Tracks when books are viewed (for analytics)
CREATE TABLE IF NOT EXISTS bookshelf_book_views (
    id BIGSERIAL PRIMARY KEY,
    book_id BIGINT NOT NULL REFERENCES bookshelf_books(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

-- Indexes for bookshelf_books
CREATE INDEX IF NOT EXISTS idx_books_site_url ON bookshelf_books(site_url);
CREATE INDEX IF NOT EXISTS idx_books_title_lower ON bookshelf_books(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_books_author_name_lower ON bookshelf_books(LOWER(author_name));
CREATE INDEX IF NOT EXISTS idx_books_publication_date ON bookshelf_books(publication_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_books_synced_at ON bookshelf_books(synced_at DESC);

-- Indexes for bookshelf_book_genres
CREATE INDEX IF NOT EXISTS idx_book_genres_book_id ON bookshelf_book_genres(book_id);
CREATE INDEX IF NOT EXISTS idx_book_genres_genre_slug ON bookshelf_book_genres(genre_slug);

-- Indexes for bookshelf_book_views
CREATE INDEX IF NOT EXISTS idx_book_views_book_id ON bookshelf_book_views(book_id);
CREATE INDEX IF NOT EXISTS idx_book_views_viewed_at ON bookshelf_book_views(viewed_at DESC);

-- ============================================================================
-- STEP 3: Create Materialized Views
-- ============================================================================

-- Materialized view: Book view counts
CREATE MATERIALIZED VIEW IF NOT EXISTS bookshelf_book_view_counts AS
SELECT
    book_id,
    COUNT(*) as view_count
FROM bookshelf_book_views
GROUP BY book_id;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_book_view_counts_book_id
ON bookshelf_book_view_counts(book_id);

-- Materialized view: Global statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS bookshelf_stats AS
SELECT
    COUNT(*) as total_books,
    COUNT(DISTINCT site_url) as total_authors,
    (SELECT COUNT(DISTINCT genre_slug) FROM bookshelf_book_genres) as total_genres
FROM bookshelf_books;

-- ============================================================================
-- STEP 4: Set Up Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on tables (optional - currently public read access)
-- Uncomment if you want to enable RLS in the future

-- ALTER TABLE bookshelf_sites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookshelf_books ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookshelf_book_genres ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookshelf_book_views ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
-- CREATE POLICY "Public read access" ON bookshelf_books FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON bookshelf_book_genres FOR SELECT USING (true);

-- ============================================================================
-- STEP 5: Grant Permissions
-- ============================================================================

-- Grant read access to anon and authenticated users
GRANT SELECT ON bookshelf_sites TO anon, authenticated;
GRANT SELECT ON bookshelf_books TO anon, authenticated;
GRANT SELECT ON bookshelf_book_genres TO anon, authenticated;
GRANT SELECT ON bookshelf_book_views TO anon, authenticated;
GRANT SELECT ON bookshelf_book_view_counts TO anon, authenticated;
GRANT SELECT ON bookshelf_stats TO anon, authenticated;

-- Grant insert/update/delete permissions for API endpoints (using service_role key)
-- Note: API uses anon key but some operations need elevated privileges
GRANT INSERT, UPDATE, DELETE ON bookshelf_sites TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON bookshelf_books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON bookshelf_book_genres TO anon, authenticated;
GRANT INSERT ON bookshelf_book_views TO anon, authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- STEP 6: Create Function to Refresh Materialized Views
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_bookshelf_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_book_view_counts;
    REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_stats;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_bookshelf_views() TO anon, authenticated;

-- ============================================================================
-- STEP 7: Set Up Automatic Updates (Optional - if pg_cron is available)
-- ============================================================================

-- Check if pg_cron is available first:
-- SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- If pg_cron is available, uncomment these:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule view count refresh every 5 minutes
-- SELECT cron.schedule(
--     'refresh-book-view-counts',
--     '*/5 * * * *',
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_book_view_counts;'
-- );

-- Schedule stats refresh every 10 minutes
-- SELECT cron.schedule(
--     'refresh-bookshelf-stats',
--     '*/10 * * * *',
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_stats;'
-- );

-- ============================================================================
-- STEP 8: Initial Data Population (Optional)
-- ============================================================================

-- If you want to add some initial/example data, add INSERT statements here
-- This is optional and can be skipped

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify everything was created successfully:

-- List all tables
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- List all materialized views
-- SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';

-- List all indexes
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

-- Check table row counts
-- SELECT 'bookshelf_sites' as table_name, COUNT(*) as row_count FROM bookshelf_sites
-- UNION ALL
-- SELECT 'bookshelf_books', COUNT(*) FROM bookshelf_books
-- UNION ALL
-- SELECT 'bookshelf_book_genres', COUNT(*) FROM bookshelf_book_genres
-- UNION ALL
-- SELECT 'bookshelf_book_views', COUNT(*) FROM bookshelf_book_views;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. This script is idempotent - safe to run multiple times
-- 2. All CREATE statements use IF NOT EXISTS
-- 3. RLS is disabled by default for public read access
-- 4. pg_cron setup is commented out - enable manually if available
-- 5. Materialized views need initial refresh after creation

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
