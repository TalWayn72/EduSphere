/**
 * Cypher parser utilities — agtype parsing, parameter substitution, and
 * literal conversion for Apache AGE Cypher queries.
 * Extracted from client.ts to keep files under 300 lines.
 */

/**
 * Convert a JS value to a safe Cypher literal string.
 *
 * - Strings are double-quoted and internal double-quotes / backslashes are escaped.
 * - Numbers and booleans are stringified as-is.
 * - null / undefined become the Cypher `null` keyword.
 */
export function toCypherLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `"${escaped}"`;
}

/**
 * Replace Cypher `$paramName` references with safe literal values.
 *
 * Only replaces `$word` tokens that exist as keys in `params`.
 * Unknown `$token` references are left untouched.
 */
export function substituteParams(
  query: string,
  params: Record<string, unknown>
): string {
  return query.replace(/\$([A-Za-z_]\w*)/g, (match, key) => {
    if (!(key in params)) return match;
    return toCypherLiteral(params[key]);
  });
}

/**
 * Parse a single Apache AGE agtype value returned in a `result` column.
 *
 * AGE returns all values as strings via the pg wire protocol:
 * - Vertex: `{"id": 123, "label": "Concept", "properties": {...}}::vertex`
 * - Edge:   `{"id": 456, ..., "properties": {...}}::edge`
 * - Scalar: `"some-text"::text`, `42::integer`, `true::boolean`
 * - Map:    `{"key": "value"}` (no ::type suffix)
 * - Path:   `[vertex, edge, vertex, ...]::path`
 *
 * This function extracts the useful JS value:
 * - Vertices/Edges -> return `properties` sub-object
 * - Scalars -> return the unwrapped primitive
 * - Already-parsed objects -> pass through unchanged
 */
export function parseAgtypeValue(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw;

  // Already a non-string value (e.g. number, boolean, object from mock)
  if (typeof raw !== 'string') return raw;

  // Strip the ::type suffix
  const cleaned = raw.replace(/::[\w.]+\s*$/, '').trim();

  if (cleaned === '') return raw;

  try {
    const parsed = JSON.parse(cleaned);

    // Vertex: has .label and .properties
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'properties' in parsed &&
      'label' in parsed
    ) {
      return parsed.properties as Record<string, unknown>;
    }

    // Edge: has .start_id, .end_id, and .properties
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'start_id' in parsed &&
      'end_id' in parsed &&
      'properties' in parsed
    ) {
      return parsed.properties as Record<string, unknown>;
    }

    return parsed;
  } catch {
    // Not valid JSON — treat as a plain string scalar
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      return cleaned.slice(1, -1);
    }
    return cleaned;
  }
}

/**
 * Unwrap a single AGE result row.
 *
 * The SQL template `AS (result agtype)` means each row has a single column
 * called `result`. This function extracts that column and parses it.
 */
export function unwrapAgeRow(row: Record<string, unknown>): unknown {
  if (row && typeof row === 'object' && 'result' in row) {
    return parseAgtypeValue(row.result);
  }
  return row;
}
