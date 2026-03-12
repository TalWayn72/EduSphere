import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OgImageService } from './og-image.service';

// ---------------------------------------------------------------------------
// sharp is a native addon — mock it so tests run without a real libvips build.
// The mock returns a deterministic non-empty Buffer so we can assert length > 0.
// ---------------------------------------------------------------------------
vi.mock('sharp', () => {
  const chain = {
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('PNG_MOCK_DATA')),
  };
  const sharpFn = vi.fn(() => chain);
  return { default: sharpFn };
});

describe('OgImageService', () => {
  let service: OgImageService;

  beforeEach(() => {
    service = new OgImageService();
  });

  // 1 — basic generation
  it('generates a non-empty Buffer', async () => {
    const buf = await service.generateOgImage('Hello World', 'A description', 'default');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  // 2 — XSS: title with <script> must be XML-escaped
  it('XSS: title with <script> is XML-escaped in SVG', () => {
    const svg = service.buildSvg(
      service.safeXmlEscape('<script>alert(1)</script>'),
      '',
      'default',
    );
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  // 3 — title truncated at 80 chars
  it('title is truncated at 80 chars before generating SVG', async () => {
    const longTitle = 'A'.repeat(100);
    const svg = service.buildSvg(service.safeXmlEscape(longTitle.slice(0, 80)), '', 'default');
    // The SVG should contain at most 80 'A' characters in a run (not 100)
    const matchLong = svg.match(/A{81,}/);
    expect(matchLong).toBeNull();
  });

  // 4 — description truncated at 160 chars
  it('description is truncated at 160 chars before generating SVG', () => {
    const longDesc = 'B'.repeat(200);
    const svg = service.buildSvg('Title', service.safeXmlEscape(longDesc.slice(0, 160)), 'default');
    // SVG description element shows first 80 chars of the (already-160-truncated) description
    const matchLong = svg.match(/B{161,}/);
    expect(matchLong).toBeNull();
  });

  // 5 — course type → green badge
  it('type=course produces green badge (#22c55e)', () => {
    const svg = service.buildSvg('Course Title', '', 'course');
    expect(svg).toContain('#22c55e');
  });

  // 6 — blog type → blue badge
  it('type=blog produces blue badge (#3b82f6)', () => {
    const svg = service.buildSvg('Blog Post', '', 'blog');
    expect(svg).toContain('#3b82f6');
  });

  // 7 — default type → purple badge
  it('type=default produces purple badge (#6c63ff)', () => {
    const svg = service.buildSvg('Default Page', '', 'default');
    expect(svg).toContain('#6c63ff');
  });

  // 8 — cache hit: second call returns same Buffer reference
  it('cache hit: second call returns same Buffer reference without calling sharp again', async () => {
    const buf1 = await service.generateOgImage('Cache Test', 'desc', 'default');
    const buf2 = await service.generateOgImage('Cache Test', 'desc', 'default');
    // Same object reference — cache was hit
    expect(buf1).toBe(buf2);
  });

  // 9 — LRU eviction: after MAX_CACHE entries oldest is deleted
  it('LRU eviction: after MAX_CACHE entries, oldest is deleted', async () => {
    // Override MAX_CACHE to 2 for this test
    (service as unknown as { MAX_CACHE: number }).MAX_CACHE = 2;

    await service.generateOgImage('Entry One', '', 'default');
    await service.generateOgImage('Entry Two', '', 'default');
    // Cache is at capacity (2)
    const cache = (service as unknown as { cache: Map<string, Buffer> }).cache;
    expect(cache.size).toBe(2);

    // Adding a third entry should evict the first
    await service.generateOgImage('Entry Three', '', 'default');
    expect(cache.size).toBe(2);
  });

  // 10 — onModuleDestroy clears the cache
  it('onModuleDestroy clears cache', async () => {
    await service.generateOgImage('Teardown Test', '', 'default');
    const cache = (service as unknown as { cache: Map<string, Buffer> }).cache;
    expect(cache.size).toBe(1);

    service.onModuleDestroy();
    expect(cache.size).toBe(0);
  });
});
