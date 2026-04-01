-- ============================================================================
-- FIX: Row Level Security for bookshelf_book_views
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to fix the RLS security warning
-- Project: https://supabase.com/dashboard/project/jviqcjxxkvlapqznxusk
-- ============================================================================

-- Step 1: Enable RLS on bookshelf_book_views (if not already enabled)
ALTER TABLE bookshelf_book_views ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public can insert views" ON bookshelf_book_views;
DROP POLICY IF EXISTS "Service role read views" ON bookshelf_book_views;

-- Step 3: Create RLS policies for bookshelf_book_views

-- Allow anyone (including anonymous users) to insert view tracking records
-- This is needed for anonymous view tracking from the frontend
CREATE POLICY "Public can insert views"
  ON bookshelf_book_views FOR INSERT
  WITH CHECK (true);

-- Allow service role to read all view records (for analytics)
-- Service role is authenticated via API key on backend
CREATE POLICY "Service role can read all views"
  ON bookshelf_book_views FOR SELECT
  USING (auth.role() = 'service_role');

-- Step 4: Grant permissions on materialized views

-- Grant SELECT on materialized view for view counts
-- This allows anonymous users to read aggregated view counts (not individual records)
GRANT SELECT ON bookshelf_book_view_counts TO anon;
GRANT SELECT ON bookshelf_book_view_counts TO authenticated;

-- Grant SELECT on bookshelf stats materialized view
GRANT SELECT ON bookshelf_stats TO anon;
GRANT SELECT ON bookshelf_stats TO authenticated;

-- Step 5: Verify RLS is working

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('bookshelf_book_views', 'bookshelf_books', 'bookshelf_sites', 'bookshelf_book_genres')
ORDER BY tablename;

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bookshelf_book_views'
ORDER BY tablename, policyname;

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- 1. bookshelf_book_views should show rowsecurity = true
-- 2. Two policies should exist:
--    - "Public can insert views" (INSERT)
--    - "Service role can read all views" (SELECT)
-- 3. No security warnings in Supabase dashboard
-- ============================================================================
