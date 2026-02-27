/**
 * HTML sanitization utilities
 * Prevents XSS attacks by sanitizing user-provided content
 */

/**
 * Sanitize HTML content by removing dangerous tags and attributes
 * Allows only safe formatting tags
 *
 * @param {string} html - The HTML string to sanitize
 * @param {boolean} stripAll - If true, strip all HTML tags (default: false)
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHtml(html, stripAll = false) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // If stripAll is true, remove all HTML tags
  if (stripAll) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Allowed safe tags for basic formatting
  const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a'];

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol from hrefs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

  // Remove style attributes
  sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

  // Remove all tags except allowed ones
  sanitized = sanitized.replace(/<(\/?)([\w]+)([^>]*)>/gi, (match, slash, tag, attrs) => {
    const lowercaseTag = tag.toLowerCase();

    // If tag is not allowed, remove it
    if (!allowedTags.includes(lowercaseTag)) {
      return '';
    }

    // For allowed tags, keep only safe attributes
    if (lowercaseTag === 'a') {
      // For anchor tags, keep only href and title
      const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
      const titleMatch = attrs.match(/title\s*=\s*["']([^"']*)["']/i);

      let safeAttrs = '';
      if (hrefMatch && hrefMatch[1]) {
        // Only allow http/https URLs
        const url = hrefMatch[1];
        if (url.match(/^(https?:\/\/|\/)/i)) {
          safeAttrs += ` href="${url}"`;
        }
      }
      if (titleMatch && titleMatch[1]) {
        safeAttrs += ` title="${titleMatch[1]}"`;
      }

      // Add rel="noopener noreferrer" for security
      if (safeAttrs) {
        safeAttrs += ' rel="noopener noreferrer" target="_blank"';
      }

      return `<${slash}${lowercaseTag}${safeAttrs}>`;
    }

    // For other allowed tags, remove all attributes
    return `<${slash}${lowercaseTag}>`;
  });

  return sanitized.trim();
}

/**
 * Sanitize plain text by encoding HTML entities
 * Use this when you want to display user input as plain text
 *
 * @param {string} text - The text to sanitize
 * @returns {string} Sanitized text with HTML entities encoded
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Truncate text to a maximum length and add ellipsis
 *
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length (default: 200)
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 200) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Validate and sanitize URL
 *
 * @param {string} url - The URL to validate
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove whitespace
  url = url.trim();

  // Only allow http, https protocols
  if (!url.match(/^https?:\/\//i)) {
    return '';
  }

  // Remove javascript:, data:, vbscript: protocols
  if (url.match(/^(javascript|data|vbscript):/i)) {
    return '';
  }

  return url;
}
