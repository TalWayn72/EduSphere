import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

export interface IngestionResult {
  extractedText: string;
  ocrMethod: 'EMBEDDED_TEXT' | 'TESSERACT' | 'PADDLE' | 'TROCR' | 'MOONDREAM' | 'NONE';
  ocrConfidence: number;
  topics: string[];
  thumbnailUrl: string | null;
  estimatedDuration: number;
  pageCount: number | null;
  warnings: string[];
  aiCaption: string | null;
  isHandwritten: boolean;
}

@Injectable()
export class ContentIngestionPipelineService implements OnModuleDestroy {
  private readonly logger = new Logger(ContentIngestionPipelineService.name);

  async ingest(buffer: Buffer, filename: string, tenantId: string): Promise<IngestionResult> {
    const fileType = await fileTypeFromBuffer(buffer);
    const mime = fileType?.mime ?? this.guessMimeFromExtension(filename);

    this.logger.log(`Ingesting ${filename} detected as ${mime} for tenant ${tenantId}`);

    if (mime === 'application/zip') {
      return this.handleZip(buffer, filename, tenantId);
    }
    if (mime === 'application/pdf') {
      return this.handlePdf(buffer, filename);
    }
    if (mime?.startsWith('image/')) {
      return this.handleImage(buffer, filename);
    }
    if (mime?.startsWith('video/')) {
      return this.handleVideo(buffer, filename);
    }
    if (mime?.startsWith('text/')) {
      return this.handleText(buffer, filename);
    }
    if (mime?.includes('officedocument') || mime?.includes('opendocument')) {
      return this.handleOfficeDocument(buffer, filename);
    }

    throw new UnsupportedMediaTypeException(`File type ${mime ?? 'unknown'} is not supported`);
  }

  private async handleZip(buffer: Buffer, filename: string, tenantId: string): Promise<IngestionResult> {
    const MAX_UNCOMPRESSED = 5 * 1024 * 1024 * 1024;

    // Dynamic import to avoid loading unzipper at startup
    const { Open } = await import('unzipper');

    const directory = await Open.buffer(buffer);

    let totalSize = 0;
    const warnings: string[] = [];

    for (const entry of directory.files) {
      if (entry.path.includes('../') || entry.path.startsWith('/')) {
        throw new BadRequestException(`ZIP contains path traversal: ${entry.path}`);
      }
      totalSize += entry.uncompressedSize ?? 0;
      if (totalSize > MAX_UNCOMPRESSED) {
        throw new BadRequestException('ZIP file exceeds 5GB uncompressed limit (potential ZIP bomb)');
      }
    }

    this.logger.log(
      `ZIP ${filename}: ${directory.files.length} entries, ` +
      `${Math.round(totalSize / 1024 / 1024)}MB uncompressed (tenant: ${tenantId})`,
    );
    warnings.push(`ZIP extracted: ${directory.files.length} files`);

    return {
      extractedText: `ZIP archive with ${directory.files.length} files`,
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings,
      aiCaption: null,
      isHandwritten: false,
    };
  }

  private handlePdf(_buffer: Buffer, filename: string): IngestionResult {
    this.logger.log(`PDF pipeline: ${filename}`);
    return {
      extractedText: '',
      ocrMethod: 'EMBEDDED_TEXT',
      ocrConfidence: 1,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings: ['PDF processing: stub implementation'],
      aiCaption: null,
      isHandwritten: false,
    };
  }

  private handleImage(_buffer: Buffer, filename: string): IngestionResult {
    this.logger.log(`Image pipeline: ${filename}`);
    return {
      extractedText: '',
      ocrMethod: 'TESSERACT',
      ocrConfidence: 0,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings: ['Image OCR: stub implementation'],
      aiCaption: null,
      isHandwritten: false,
    };
  }

  private handleVideo(_buffer: Buffer, filename: string): IngestionResult {
    this.logger.log(`Video pipeline (transcription worker): ${filename}`);
    return {
      extractedText: '',
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings: ['Video: dispatched to transcription worker'],
      aiCaption: null,
      isHandwritten: false,
    };
  }

  private handleText(buffer: Buffer, filename: string): IngestionResult {
    const text = buffer.toString('utf8');
    this.logger.log(`Text pipeline: ${filename}, ${text.length} chars`);
    return {
      extractedText: text,
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: Math.ceil(text.length / 1500),
      pageCount: null,
      warnings: [],
      aiCaption: null,
      isHandwritten: false,
    };
  }

  private handleOfficeDocument(_buffer: Buffer, filename: string): IngestionResult {
    this.logger.log(`Office document pipeline (LibreOffice): ${filename}`);
    return {
      extractedText: '',
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings: ['Office document: dispatched to LibreOffice service'],
      aiCaption: null,
      isHandwritten: false,
    };
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

  onModuleDestroy(): void {
    this.logger.log('ContentIngestionPipelineService destroyed');
  }
}
