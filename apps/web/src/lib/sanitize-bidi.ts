/**
 * Strips Unicode BiDi control characters that could be used for text reordering attacks.
 * Characters stripped: LRE (U+202A), RLE (U+202B), PDF (U+202C), LRO (U+202D),
 * RLO (U+202E), LRI (U+2066), RLI (U+2067), FSI (U+2068), PDI (U+2069)
 */
export function stripBiDiControls(input: string): string {
  return input.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
}
