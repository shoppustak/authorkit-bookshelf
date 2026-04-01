-- ============================================================================
-- Verification Queries for RLS Security Fix
-- ============================================================================
-- Run these in Supabase SQL Editor to confirm everything is working correctly
-- ============================================================================

-- Query 1: Check RLS is enabled on all tables
-- Expected: All tables should show rowsecurity = true
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN (
    'bookshelf_book_views',
    'bookshelf_books',
    'bookshelf_sites',
    'bookshelf_book_genres'
)
ORDER BY tablename;

-- ============================================================================

-- Query 2: Check policies exist for bookshelf_book_views
-- Expected: Should see 2 policies:
--   - "Public can insert views" (INSERT)
--   - "Service role can read all views" (SELECT)
SELECT
    tablename,
    policyname,
    cmd as operation,
    roles,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'bookshelf_book_views'
ORDER BY policyname;

-- ============================================================================

-- Query 3: Check all RLS policies across bookshelf tables
-- Expected: Should see policies for all tables
SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename LIKE 'bookshelf%'
ORDER BY tablename, policyname;

-- ============================================================================

-- Query 4: Verify materialized view permissions
-- Expected: anon and authenticated roles should have SELECT access
SELECT
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('bookshelf_book_view_counts', 'bookshelf_stats')
    AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- ============================================================================

-- Query 5: Test that anonymous users can insert view records
-- This should succeed (returns the inserted record)
INSERT INTO bookshelf_book_views (book_id, viewed_at)
SELECT
    id,
    NOW()
FROM bookshelf_books
LIMIT 1
RETURNING id, book_id, viewed_at;

-- ============================================================================

-- Query 6: Check for any remaining security warnings
-- Expected: No tables with RLS disabled that have public grants
SELECT
    t.tablename,
    t.rowsecurity,
    CASE
        WHEN t.rowsecurity = false THEN '⚠️  WARNING: RLS disabled'
        ELSE '✓ RLS enabled'
    END as status
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND t.tablename LIKE 'bookshelf%'
    AND t.tablename NOT LIKE 'pg_%'
ORDER BY t.tablename;

-- ============================================================================
-- Expected Results Summary:
-- ============================================================================
-- ✓ All bookshelf tables have rowsecurity = true
-- ✓ bookshelf_book_views has 2 policies defined
-- ✓ Materialized views have SELECT grants for anon/authenticated
-- ✓ Test INSERT succeeds
-- ✓ No security warnings remain
-- ============================================================================
