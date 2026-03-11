/**
 * Safely serializes an object to JSON-LD string, escaping </script> injection vectors.
 * JSON.stringify() does NOT escape </script> which can break out of a <script> tag.
 * This helper replaces all occurrences of '</' with '<\/' which is valid JSON
 * and prevents XSS via JSON-LD injection.
 *
 * @see https://owasp.org/www-community/attacks/xss/
 */
export function safeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/<\//g, '<\\/');
}
