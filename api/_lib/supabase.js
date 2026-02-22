/**
 * Supabase Client Helper
 *
 * Creates and exports a configured Supabase client using the service role key.
 * This client bypasses Row Level Security and should ONLY be used server-side.
 *
 * Environment variables required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_KEY: Service role key (NOT the anon key)
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing environment variable: SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_KEY');
}

// Create Supabase client with service role key
// This bypasses RLS and has full database access - use with caution
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;

/**
 * Helper function to handle Supabase errors
 * @param {Object} error - Supabase error object
 * @returns {Object} Formatted error response
 */
export function formatSupabaseError(error) {
  return {
    success: false,
    error: error.message || 'Database error occurred',
    code: error.code || 'UNKNOWN_ERROR'
  };
}

/**
 * Helper function to validate required fields in a payload
 * @param {Object} payload - Request payload
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object|null} Error object if validation fails, null if valid
 */
export function validatePayload(payload, requiredFields) {
  const missing = requiredFields.filter(field => !payload[field]);

  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required fields: ${missing.join(', ')}`,
      code: 'VALIDATION_ERROR'
    };
  }

  return null;
}
