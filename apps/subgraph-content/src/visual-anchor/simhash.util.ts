/**
 * Compute a 64-bit simhash fingerprint for fuzzy text matching.
 * Returns a 16-character hex string.
 * Used for anchor version-sync: similar text → similar hash.
 */
export function computeSimhash(text: string): string {
  const tokens = text.toLowerCase().split(/\s+/);
  const v = new Array<number>(64).fill(0);

  for (const token of tokens) {
    // FNV-inspired cheap hash — good enough for 64-bit simhash tokens
    let h = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
      h = (Math.imul(h ^ token.charCodeAt(i), 0x01000193)) >>> 0;
    }
    for (let i = 0; i < 64; i++) {
      // Use bits from both halves of the 32-bit hash via modulo rotation
      const bit = (h >>> (i % 32)) & 1;
      v[i] = (v[i] ?? 0) + (bit ? 1 : -1);
    }
  }

  let hash = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble =
      ((v[i]! > 0 ? 8 : 0) |
        (v[i + 1]! > 0 ? 4 : 0) |
        (v[i + 2]! > 0 ? 2 : 0) |
        (v[i + 3]! > 0 ? 1 : 0));
    hash += nibble.toString(16);
  }
  return hash; // 16 hex chars = 64 bits
}

/**
 * Hamming distance between two simhash strings (hex-encoded, same length).
 * Lower distance = more similar text.
 */
export function simhashDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = (parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16));
    dist += xor.toString(2).split('').filter((c) => c === '1').length;
  }
  return dist;
}
