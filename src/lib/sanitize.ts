import DOMPurify from 'dompurify';

/**
 * HTML Sanitization utilities for XSS protection
 *
 * SECURITY: Always sanitize user-generated content before rendering.
 * Use these functions for any content that comes from:
 * - User input (forms, comments, notes)
 * - API responses containing user-generated content
 * - URL parameters or query strings
 */

/**
 * Sanitize HTML content, removing dangerous scripts and attributes.
 * Allows safe HTML tags like <b>, <i>, <a>, <p>, etc.
 *
 * @param dirty - Untrusted HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
    // Force all links to open in new tab with security attributes
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Sanitize text content, stripping all HTML tags.
 * Use for plain text fields that should never contain HTML.
 *
 * @param dirty - Untrusted string
 * @returns Plain text with all HTML removed
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize a string for safe use in URLs.
 * Prevents javascript: and data: URL attacks.
 *
 * @param dirty - Untrusted URL string
 * @returns Sanitized URL or empty string if dangerous
 */
export function sanitizeUrl(dirty: string): string {
  const trimmed = dirty.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  const hasProtocol = safeProtocols.some((p) => trimmed.startsWith(p));

  // If no protocol, assume relative URL (safe)
  // If has protocol, must be in safe list
  if (trimmed.includes(':') && !hasProtocol) {
    return '';
  }

  return dirty;
}

/**
 * Escape HTML entities for safe text display.
 * Use when you need to display user content as text, not HTML.
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML context
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

// Configure DOMPurify hooks for additional security
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Force all links to open in new tab with noopener
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
