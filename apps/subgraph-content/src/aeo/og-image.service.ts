/**
 * OgImageService — Generates Open Graph 1200×630 PNG images using sharp.
 * Only called from published content endpoints (courses, blog posts, features).
 *
 * Renders an SVG template then rasterises it via sharp.
 * In-memory LRU cache (max 100 entries) prevents repeated work for the same
 * title/description/type combination.
 *
 * Memory-safe: implements OnModuleDestroy to clear the cache on shutdown.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import sharp from 'sharp';
import { createHash } from 'crypto';

type OgType = 'course' | 'blog' | 'default';

@Injectable()
export class OgImageService implements OnModuleDestroy {
  private readonly cache = new Map<string, Buffer>();
  private readonly MAX_CACHE = 100;

  async generateOgImage(
    title: string,
    description: string,
    type: OgType,
  ): Promise<Buffer> {
    const key = createHash('sha256')
      .update(`${title}|${description}|${type}`)
      .digest('hex');

    // LRU: return cached buffer if present
    if (this.cache.has(key)) return this.cache.get(key)!;

    // LRU: evict oldest entry when at capacity
    if (this.cache.size >= this.MAX_CACHE) {
      const firstKey = this.cache.keys().next().value as string;
      this.cache.delete(firstKey);
    }

    const svg = this.buildSvg(
      this.safeXmlEscape(title.slice(0, 80)),
      description ? this.safeXmlEscape(description.slice(0, 160)) : '',
      type,
    );

    const buffer = await sharp(Buffer.from(svg))
      .resize(1200, 630)
      .png()
      .toBuffer();

    this.cache.set(key, buffer);
    return buffer;
  }

  onModuleDestroy(): void {
    this.cache.clear();
  }

  safeXmlEscape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  buildSvg(title: string, description: string, type: OgType): string {
    const badgeColor =
      type === 'course' ? '#22c55e' : type === 'blog' ? '#3b82f6' : '#6c63ff';
    const badgeLabel =
      type === 'course' ? 'Course' : type === 'blog' ? 'Blog' : 'EduSphere';

    // Split title into lines (max 3, ~35 chars per line)
    const words = title.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > 35 && current) {
        lines.push(current.trim());
        current = word;
        if (lines.length === 2) {
          current += ' …';
          break;
        }
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) lines.push(current.trim());

    const titleLines = lines.slice(0, 3);
    const titleY = 280 - (titleLines.length - 1) * 35;

    return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a1a2e"/>
          <stop offset="100%" stop-color="#16213e"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="60" y="80" font-family="'Segoe UI',Arial,sans-serif" font-size="36" font-weight="700" fill="#6c63ff">EduSphere</text>
      <rect x="60" y="100" width="${badgeLabel.length * 13 + 24}" height="36" rx="18" fill="${badgeColor}"/>
      <text x="${badgeLabel.length * 6.5 + 60}" y="123" font-family="'Segoe UI',Arial,sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle">${badgeLabel}</text>
      ${titleLines
        .map(
          (line, i) =>
            `<text x="60" y="${titleY + i * 70}" font-family="'Segoe UI',Arial,sans-serif" font-size="52" font-weight="700" fill="white">${line}</text>`,
        )
        .join('\n      ')}
      ${
        description
          ? `<text x="60" y="480" font-family="'Segoe UI',Arial,sans-serif" font-size="28" fill="#94a3b8">${description.slice(0, 80)}${description.length > 80 ? '…' : ''}</text>`
          : ''
      }
      <rect x="0" y="610" width="1200" height="4" fill="#6c63ff"/>
      <text x="60" y="590" font-family="'Segoe UI',Arial,sans-serif" font-size="22" fill="#64748b">app.edusphere.dev</text>
    </svg>`;
  }
}
