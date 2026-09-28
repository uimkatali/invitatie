/**
 * Escapes text for safe insertion into HTML content or into a quoted (double or single)
 * HTML attribute value. NOT safe on its own for: URLs (use encodeURIComponent / a URL
 * allowlist), unquoted attribute values, inline CSS, or inline JavaScript - those contexts
 * need their own escaping/validation.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
