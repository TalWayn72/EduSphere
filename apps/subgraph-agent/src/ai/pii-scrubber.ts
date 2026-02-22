/**
 * PII Scrubber — removes personally identifiable information before sending to external LLMs.
 * EU AI Act + GDPR Art.28: Data processors must not receive more data than necessary.
 *
 * Uses pattern-based detection (no external API required).
 * For production: integrate Microsoft Presidio for higher accuracy.
 */

export interface ScrubResult {
  text: string;
  redactedCount: number;
  types: string[];
}

// PII patterns to detect and redact — ORDER MATTERS: more specific patterns first.
const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
  },
  // IP addresses must come before phone patterns to avoid partial digit matches.
  {
    name: 'IP_ADDRESS',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_ADDRESS]',
  },
  {
    name: 'PHONE_IL',
    pattern: /\b(?:\+972|0)(?:-?[0-9]){9,10}\b/g,
    replacement: '[PHONE]',
  },
  // International phone: +country-code with optional hyphens/spaces, 7-15 digits total.
  {
    name: 'PHONE_INTL',
    pattern: /\+[1-9][\d\s\-]{6,14}\d/g,
    replacement: '[PHONE]',
  },
  {
    name: 'ISRAELI_ID',
    pattern: /\b\d{9}\b/g,
    replacement: '[ID_NUMBER]',
  },
  {
    name: 'CREDIT_CARD',
    pattern: /\b(?:\d[ -]?){13,16}\b/g,
    replacement: '[CARD_NUMBER]',
  },
];

/**
 * Scrub PII from text before sending to external LLM.
 * Returns scrubbed text and metadata about what was removed.
 */
export function scrubPII(text: string): ScrubResult {
  let result = text;
  let redactedCount = 0;
  const types: string[] = [];

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regexes before each use.
    pattern.lastIndex = 0;
    const matches = result.match(pattern);
    if (matches && matches.length > 0) {
      redactedCount += matches.length;
      if (!types.includes(name)) types.push(name);
      pattern.lastIndex = 0;
      result = result.replace(pattern, replacement);
    }
  }

  return { text: result, redactedCount, types };
}

/**
 * Check if text contains PII without redacting (for logging/alerting).
 */
export function containsPII(text: string): boolean {
  return PII_PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(text);
  });
}
