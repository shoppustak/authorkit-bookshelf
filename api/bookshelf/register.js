/**
 * POST /api/bookshelf/register
 *
 * Registers a WordPress site to the AuthorKit Bookshelf.
 * Called when an author enables the Bookshelf feature in their plugin settings.
 *
 * Request body:
 * {
 *   "site_url": "https://authorsite.com",
 *   "site_name": "Jane's Author Site"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "site_id": 123,
 *   "message": "Site registered successfully"
 * }
 */

import supabase, { formatSupabaseError, validatePayload } from '../_lib/supabase.js';
import { setCorsHeaders, setSecurityHeaders } from '../_lib/security.js';

export default async function handler(req, res) {
  // Set CORS and security headers
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    const validationError = validatePayload(payload, ['site_url', 'site_name']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const { site_url, site_name } = payload;

    // Upsert site registration (insert or update if exists)
    const { data, error } = await supabase
      .from('bookshelf_sites')
      .upsert(
        {
          site_url: site_url,
          site_name: site_name,
          active: true,
          registered_at: new Date().toISOString()
        },
        {
          onConflict: 'site_url',
          returning: 'representation'
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json(formatSupabaseError(error));
    }

    // Success response
    return res.status(200).json({
      success: true,
      site_id: data.id,
      message: 'Site registered successfully'
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
