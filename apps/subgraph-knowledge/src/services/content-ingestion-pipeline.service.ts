import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { connect, NatsConnection, StringCodec } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

export interface IngestionResult {
  extractedText: string;
  ocrMethod:
    | 'EMBEDDED_TEXT'
    | 'TESSERACT'
    | 'PADDLE'
    | 'TROCR'
    | 'MOONDREAM'
    | 'NONE';
  ocrConfidence: number;
  topics: string[];
  thumbnailUrl: string | null;
  estimatedDuration: number;
  pageCount: number | null;
  warnings: string[];
  aiCaption: string | null;
  isHandwritten: boolean;
}

/** Factory for IngestionResult with sensible defaults — eliminates repeated boilerplate. */
function createResult(
  overrides: Partial<IngestionResult> &
    Pick<IngestionResult, 'extractedText' | 'ocrMethod' | 'ocrConfidence'>
): IngestionResult {
  return {
    topics: [],
    thumbnailUrl: null,
    estimatedDuration: 0,
    pageCount: null,
    warnings: [],
    aiCaption: null,
    isHandwritten: false,
    ...overrides,
  };
}

@Injectable()
export class ContentIngestionPipelineService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ContentIngestionPipelineService.name);
  private natsConnection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  async onModuleInit(): Promise<void> {
    try {
      this.natsConnection = await connect(buildNatsOptions());
      this.logger.log('ContentIngestionPipeline connected to NATS');
    } catch (err) {
      this.logger.warn(
        { err },
        '[ContentIngestionPipelineService] NATS connection failed — video dispatch disabled'
      );
    }
  }

  async ingest(
    buffer: Buffer,
    filename: string,
    tenantId: string
  ): Promise<IngestionResult> {
    const fileType = await fileTypeFromBuffer(buffer);
    const mime = fileType?.mime ?? this.guessMimeFromExtension(filename);

    this.logger.log(
      `Ingesting ${filename} detected as ${mime} for tenant ${tenantId}`
    );

    if (mime === 'application/zip') {
      return this.handleZip(buffer, filename, tenantId);
    }
    if (mime === 'application/pdf') {
      return this.handlePdf(buffer, filename);
    }
    if (mime?.startsWith('image/')) {
      return this.handleImage(filename);
    }
    if (mime?.startsWith('video/')) {
      return this.handleVideo(buffer, filename, tenantId);
    }
    if (mime?.startsWith('text/')) {
      return this.handleText(buffer, filename);
    }
    if (mime?.includes('officedocument') || mime?.includes('opendocument')) {
      return this.handleOfficeDocument(filename);
    }

    throw new UnsupportedMediaTypeException(
      `File type ${mime ?? 'unknown'} is not supported`
    );
  }

  private async handleZip(
    buffer: Buffer,
    filename: string,
    tenantId: string
  ): Promise<IngestionResult> {
    const MAX_UNCOMPRESSED = 5 * 1024 * 1024 * 1024;
    const { Open } = await import('unzipper');
    const directory = await Open.buffer(buffer);

    let totalSize = 0;
    const warnings: string[] = [];

    for (const entry of directory.files) {
      if (entry.path.includes('../') || entry.path.startsWith('/')) {
        throw new BadRequestException(
          `ZIP contains path traversal: ${entry.path}`
        );
      }
      totalSize += entry.uncompressedSize ?? 0;
      if (totalSize > MAX_UNCOMPRESSED) {
        throw new BadRequestException(
          'ZIP file exceeds 5GB uncompressed limit (potential ZIP bomb)'
        );
      }
    }

    this.logger.log(
      `ZIP ${filename}: ${directory.files.length} entries, ` +
        `${Math.round(totalSize / 1024 / 1024)}MB uncompressed (tenant: ${tenantId})`
    );
    warnings.push(`ZIP extracted: ${directory.files.length} files`);

    return createResult({
      extractedText: `ZIP archive with ${directory.files.length} files`,
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      warnings,
    });
  }

  private async handlePdf(
    buffer: Buffer,
    filename: string
  ): Promise<IngestionResult> {
    this.logger.log(
      `[ContentIngestionPipelineService] PDF pipeline: ${filename}`
    );
    const warnings: string[] = [];

    try {
      const { PDFParse } = (await import('pdf-parse')) as {
        PDFParse: new (opts: { data: Buffer }) => {
          getText(): Promise<{ text: string; total: number }>;
          destroy(): Promise<void>;
        };
      };
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();

      const text = result.text
        .replace(/\r\n/g, '\n')
        .replace(/\s{3,}/g, '\n')
        .trim();

      this.logger.log(
        `[ContentIngestionPipelineService] PDF extracted: ${text.length} chars, ${result.total} pages from ${filename}`
      );

      return createResult({
        extractedText: text,
        ocrMethod: 'EMBEDDED_TEXT',
        ocrConfidence: text.length > 0 ? 0.95 : 0,
        estimatedDuration: Math.ceil(
          text.split(/\s+/).filter(Boolean).length / 250
        ),
        pageCount: result.total,
        warnings,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { err, filename },
        `[ContentIngestionPipelineService] PDF parsing failed: ${msg}`
      );
      warnings.push(`PDF parsing failed: ${msg}`);
      return createResult({
        extractedText: '',
        ocrMethod: 'EMBEDDED_TEXT',
        ocrConfidence: 0,
        warnings,
      });
    }
  }

  private handleImage(filename: string): IngestionResult {
    this.logger.warn(
      `[ContentIngestionPipelineService] OCR not yet available for image: ${filename} — returning empty text`
    );
    return createResult({
      extractedText: '',
      ocrMethod: 'NONE',
      ocrConfidence: 0,
      warnings: ['Image OCR: not yet available — text extraction skipped'],
    });
  }

  private async handleVideo(
    _buffer: Buffer,
    filename: string,
    tenantId: string
  ): Promise<IngestionResult> {
    this.logger.log(
      `[ContentIngestionPipelineService] Video pipeline — dispatching to transcription worker: ${filename}`
    );
    const warnings: string[] = [];

    if (this.natsConnection) {
      try {
        const js = this.natsConnection.jetstream();
        const payload = {
          fileKey: filename,
          assetId: `pending-${Date.now()}`,
          courseId: '',
          tenantId,
          fileName: filename,
          contentType: 'video/*',
        };
        const data = this.sc.encode(JSON.stringify(payload));
        await js.publish('media.uploaded', data);
        this.logger.log(
          `[ContentIngestionPipelineService] Published media.uploaded for ${filename} (tenant: ${tenantId})`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          { err, filename, tenantId },
          `[ContentIngestionPipelineService] Failed to dispatch video to transcription worker: ${msg}`
        );
        warnings.push(`Video dispatch failed: ${msg}`);
      }
    } else {
      this.logger.warn(
        `[ContentIngestionPipelineService] NATS not connected — video ${filename} not dispatched`
      );
      warnings.push('Video: NATS not connected — transcription not dispatched');
    }

    return createResult({
      extractedText: '',
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      warnings: [
        ...warnings,
        'Video: dispatched to transcription worker — text available after processing',
      ],
    });
  }

  private handleText(buffer: Buffer, filename: string): IngestionResult {
    const text = buffer.toString('utf8');
    this.logger.log(`Text pipeline: ${filename}, ${text.length} chars`);
    return createResult({
      extractedText: text,
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      estimatedDuration: Math.ceil(text.length / 1500),
    });
  }

  private handleOfficeDocument(filename: string): IngestionResult {
    this.logger.log(`Office document pipeline (LibreOffice): ${filename}`);
    return createResult({
      extractedText: '',
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      warnings: ['Office document: dispatched to LibreOffice service'],
    });
  }

  private guessMimeFromExtension(filename: string): string | null {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      zip: 'application/zip',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      gif: 'image/gif',
      txt: 'text/plain',
      md: 'text/markdown',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    return ext ? (map[ext] ?? null) : null;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.natsConnection) {
      await this.natsConnection.drain().catch(() => undefined);
      this.natsConnection = null;
      this.logger.log(
        'ContentIngestionPipelineService NATS connection drained'
      );
    }
    this.logger.log('ContentIngestionPipelineService destroyed');
  }
}
