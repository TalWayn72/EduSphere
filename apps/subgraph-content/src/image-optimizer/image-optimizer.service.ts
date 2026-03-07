import { Injectable, Logger, BadRequestException } from '@nestjs/common';

// sharp and file-type are optional peer deps — guard for environments without them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharpFn = (input: Buffer) => { webp(opts: unknown): { toBuffer(): Promise<Buffer> }; metadata(): Promise<{ width?: number; height?: number }> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FileTypeFromBufferFn = (buf: Buffer) => Promise<{ mime: string } | undefined>;

let sharpFn: SharpFn | null = null;
let fileTypeFromBuffer: FileTypeFromBufferFn | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharpFn = require('sharp') as SharpFn;
} catch {
  // sharp is a native module — may be absent in CI without native binaries
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ft = require('file-type') as { fileTypeFromBuffer: FileTypeFromBufferFn };
  fileTypeFromBuffer = ft.fileTypeFromBuffer;
} catch {
  // file-type is ESM-only in v19+; graceful fallback
}

export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'image/bmp',
]);

// GIF (animation) and SVG (vector) skip lossy WebP conversion
const SKIP_WEBP_CONVERSION = new Set(['image/gif', 'image/svg+xml']);

@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  /**
   * Verify buffer magic bytes match an allowed image type.
   * Returns detected MIME string.
   * Throws BadRequestException for disallowed or undetectable types.
   */
  async verifyMagicBytes(buffer: Buffer): Promise<string> {
    if (fileTypeFromBuffer) {
      const detected = await fileTypeFromBuffer(buffer);
      if (detected && ALLOWED_MIME_TYPES.has(detected.mime)) {
        return detected.mime;
      }
      // file-type may miss SVG (XML text) — fall through to text heuristic
      if (detected && !ALLOWED_MIME_TYPES.has(detected.mime)) {
        throw new BadRequestException(
          `File type not allowed: ${detected.mime}. Allowed: PNG, JPG, GIF, SVG, TIFF, BMP, WEBP`
        );
      }
    }

    // SVG / XML text heuristic (file-type doesn't detect SVG reliably)
    const header = buffer.subarray(0, 512).toString('utf-8');
    if (header.includes('<svg') || header.includes('<?xml')) {
      return 'image/svg+xml';
    }

    if (!fileTypeFromBuffer) {
      // file-type unavailable — accept on declared MIME (validated by caller)
      this.logger.warn('[ImageOptimizerService] file-type package unavailable; skipping magic-byte check');
      return 'application/octet-stream';
    }

    throw new BadRequestException(
      'Cannot determine file type. Corrupted or unsupported file.'
    );
  }

  /**
   * Detect potential ZIP/decompression bomb:
   * If buffer is > 3x declaredSize AND > 5MB, reject.
   */
  async checkZipBomb(buffer: Buffer, declaredSize: number): Promise<void> {
    if (buffer.length > declaredSize * 3 && buffer.length > 5 * 1024 * 1024) {
      this.logger.warn(
        `[ImageOptimizerService] Potential ZIP bomb: declared=${declaredSize} actual=${buffer.length}`
      );
      throw new BadRequestException(
        'File size mismatch detected. Upload rejected for security.'
      );
    }
  }

  /**
   * Extract width/height from image buffer using sharp.
   * Returns {0,0} if sharp is unavailable or extraction fails.
   */
  async extractDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    if (!sharpFn) {
      return { width: 0, height: 0 };
    }
    try {
      const meta = await sharpFn(buffer).metadata();
      return { width: meta.width ?? 0, height: meta.height ?? 0 };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  /**
   * Convert image buffer to WebP (quality 85).
   * GIF and SVG are returned as-is (no lossy conversion).
   * Falls back to original buffer if sharp fails.
   */
  async optimizeToWebP(buffer: Buffer, mimeType: string): Promise<Buffer> {
    if (SKIP_WEBP_CONVERSION.has(mimeType)) {
      return buffer;
    }
    if (!sharpFn) {
      this.logger.warn('[ImageOptimizerService] sharp unavailable — returning original buffer');
      return buffer;
    }
    try {
      const webp = await sharpFn(buffer)
        .webp({ quality: 85, effort: 4 } as unknown as Parameters<ReturnType<SharpFn>['webp']>[0])
        .toBuffer();
      this.logger.debug(
        `[ImageOptimizerService] Converted ${mimeType} → WebP (${buffer.length} → ${webp.length} bytes)`
      );
      return webp;
    } catch (err) {
      this.logger.warn(`[ImageOptimizerService] WebP conversion failed: ${String(err)}. Returning original.`);
      return buffer;
    }
  }
}
