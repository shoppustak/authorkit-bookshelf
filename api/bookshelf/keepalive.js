/**
 * GET /api/bookshelf/keepalive
 *
 * Keepalive endpoint to prevent Supabase database from pausing.
 * Called by Vercel cron every 6 days (configured in vercel.json).
 *
 * Supabase free tier pauses after 7 days of inactivity with ~60s cold start.
 * This cron runs every 6 days to keep the database active.
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Database keepalive successful",
 *   "timestamp": "2026-02-22T12:00:00.000Z"
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
    // Perform a simple query to keep the database active
    // Using head: true means we only get the count, not the actual data
    const { count, error } = await supabase
      .from('bookshelf_books')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Keepalive query error:', error);
      return res.status(500).json(formatSupabaseError(error));
    }

    // Log success for monitoring
    console.log(`[Keepalive] Database active - ${count || 0} books in database`);

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Database keepalive successful',
      timestamp: new Date().toISOString(),
      books_count: count || 0
    });

  } catch (error) {
    console.error('Unexpected keepalive error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
