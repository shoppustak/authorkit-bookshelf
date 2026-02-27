# Supabase Database Setup Instructions

Follow these steps in your Supabase dashboard to implement performance optimizations.

**Project URL**: https://supabase.com/dashboard/project/jviqcjxxkvlapqznxusk

---

## Step 1: Open SQL Editor

1. Go to https://supabase.com/dashboard/project/jviqcjxxkvlapqznxusk
2. Click **SQL Editor** in the left sidebar
3. Click **New query** button

---

## Step 2: Create Materialized View for Book View Counts

Copy and paste this SQL into the editor:

```sql
-- Create materialized view for book view counts
CREATE MATERIALIZED VIEW IF NOT EXISTS bookshelf_book_view_counts AS
SELECT
  book_id,
  COUNT(*) as view_count
FROM bookshelf_book_views
GROUP BY book_id;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_book_view_counts_book_id
ON bookshelf_book_view_counts(book_id);

-- Grant access to anon role
GRANT SELECT ON bookshelf_book_view_counts TO anon;
GRANT SELECT ON bookshelf_book_view_counts TO authenticated;
```

**Click "Run"** ✅

---

## Step 3: Create Materialized View for Statistics

```sql
-- Create materialized view for global statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS bookshelf_stats AS
SELECT
  COUNT(*) as total_books,
  COUNT(DISTINCT site_url) as total_authors,
  (SELECT COUNT(DISTINCT genre_slug) FROM bookshelf_book_genres) as total_genres
FROM bookshelf_books;

-- Grant access to anon role
GRANT SELECT ON bookshelf_stats TO anon;
GRANT SELECT ON bookshelf_stats TO authenticated;
```

**Click "Run"** ✅

---

## Step 4: Create Database Indexes

```sql
-- Index for genre filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_book_genres_genre_slug
ON bookshelf_book_genres(genre_slug);

-- Index for book_id lookup in genres table
CREATE INDEX IF NOT EXISTS idx_book_genres_book_id
ON bookshelf_book_genres(book_id);

-- Index for sorting by publication date
CREATE INDEX IF NOT EXISTS idx_books_publication_date
ON bookshelf_books(publication_date DESC NULLS LAST);

-- Index for sorting by sync date
CREATE INDEX IF NOT EXISTS idx_books_synced_at
ON bookshelf_books(synced_at DESC);

-- Index for title search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_books_title_lower
ON bookshelf_books(LOWER(title));

-- Index for author name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_books_author_name_lower
ON bookshelf_books(LOWER(author_name));
```

**Click "Run"** ✅

---

## Step 5: Set Up Automatic Materialized View Refresh

### Option A: Using pg_cron (Recommended)

Check if pg_cron is enabled:

```sql
-- Check if pg_cron extension exists
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';
```

If available, enable it and schedule refresh:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule view count refresh every 5 minutes
SELECT cron.schedule(
  'refresh-book-view-counts',
  '*/5 * * * *',  -- Every 5 minutes
  'REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_book_view_counts;'
);

-- Schedule stats refresh every 10 minutes
SELECT cron.schedule(
  'refresh-bookshelf-stats',
  '*/10 * * * *',  -- Every 10 minutes
  'REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_stats;'
);
```

**Click "Run"** ✅

### Option B: Manual Refresh (Fallback)

If pg_cron is not available, you can manually refresh or use Supabase Functions:

```sql
-- Run these queries manually when needed, or via scheduled Supabase Function
REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_book_view_counts;
REFRESH MATERIALIZED VIEW CONCURRENTLY bookshelf_stats;
```

---

## Step 6: Initial Population

Refresh the materialized views for the first time:

```sql
-- Initial refresh (run once after creation)
REFRESH MATERIALIZED VIEW bookshelf_book_view_counts;
REFRESH MATERIALIZED VIEW bookshelf_stats;
```

**Click "Run"** ✅

---

## Step 7: Verify Everything Works

Run these queries to test:

```sql
-- Test view counts
SELECT * FROM bookshelf_book_view_counts LIMIT 10;

-- Test stats
SELECT * FROM bookshelf_stats;

-- Test indexes are being used (EXPLAIN query plan)
EXPLAIN ANALYZE
SELECT * FROM bookshelf_books
WHERE LOWER(title) LIKE '%fantasy%'
ORDER BY synced_at DESC
LIMIT 20;
```

You should see index scans (not sequential scans) in the EXPLAIN output.

---

## Step 8: Update API to Use Materialized Views (Optional)

**Note**: The current API code in `books.js` already has comments showing where to use these views.

If you want to implement this optimization now, the changes would be:

### Replace View Count Query

**Current** (lines 125-144):
```javascript
const bookIds = books.map(b => b.id);
const { data: viewCounts } = await supabase
  .from('bookshelf_book_views')
  .select('book_id')
  .in('book_id', bookIds);

// Count manually in JavaScript
```

**Optimized** (use materialized view):
```javascript
const bookIds = books.map(b => b.id);
const { data: viewCounts } = await supabase
  .from('bookshelf_book_view_counts')
  .select('book_id, view_count')
  .in('book_id', bookIds);

// View counts already aggregated
const viewCountMap = {};
viewCounts?.forEach(v => {
  viewCountMap[v.book_id] = v.view_count;
});
```

### Replace Stats Query

**Current** (lines 187-196):
```javascript
const { count: totalBooks } = await supabase
  .from('bookshelf_books')
  .select('*', { count: 'exact', head: true });

const { data: authorStats } = await supabase
  .from('bookshelf_books')
  .select('site_url')
  .limit(1000);

const uniqueAuthors = new Set(authorStats?.map(b => b.site_url) || []).size;
```

**Optimized** (use materialized view):
```javascript
const { data: stats } = await supabase
  .from('bookshelf_stats')
  .select('*')
  .single();

const totalBooks = stats?.total_books || 0;
const uniqueAuthors = stats?.total_authors || 0;
```

**I can make these API changes for you if you'd like!** Just let me know after you've run the SQL scripts.

---

## Troubleshooting

### If pg_cron is not available:

Supabase Free tier may not include pg_cron. Alternatives:

1. **Supabase Edge Functions** (Recommended)
   - Create a scheduled function to refresh views
   - Free tier includes this

2. **External Cron Job** (Simple)
   - Use GitHub Actions or similar
   - Call an API endpoint that refreshes views

3. **Manual Refresh** (Acceptable for low traffic)
   - Run `REFRESH MATERIALIZED VIEW` queries manually weekly

### If CONCURRENTLY fails:

Remove `CONCURRENTLY` keyword:
```sql
REFRESH MATERIALIZED VIEW bookshelf_book_view_counts;
```

Note: Non-concurrent refresh locks the table briefly.

---

## Performance Monitoring

After implementation, monitor these metrics in Supabase dashboard:

1. **Database** → **Query Performance**
   - Look for queries using your new indexes
   - Average query time should drop

2. **Database** → **Extensions** → **pg_stat_statements**
   - See which queries are fastest/slowest

3. **API Performance**
   - Monitor `/api/bookshelf/books` response time
   - Should drop from ~200ms to ~80ms

---

## Expected Results

After completing all steps:

- ✅ Book listing API ~60% faster
- ✅ Database queries reduced from 4 to 2 per request
- ✅ Stats calculated once per 10 minutes (not per request)
- ✅ View counts cached and updated every 5 minutes
- ✅ Search queries use indexes (faster results)

---

## Next Steps

1. Run all SQL scripts above in order (Steps 2-6)
2. Verify with Step 7
3. Let me know if you want me to update the API code (Step 8)
4. Monitor performance for 24 hours
5. Check Supabase logs for any errors

**Questions?** I'm here to help!
