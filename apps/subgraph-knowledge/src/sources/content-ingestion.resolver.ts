import { randomUUID } from 'node:crypto';
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import {
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import type { ContentIngestionResultDto } from './content-ingestion.dto.js';
import { TesseractOcrService } from '../services/tesseract-ocr.service.js';

/** SSRF guard: reject private/loopback URLs before fetch. */
function assertSafeUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException(
      `Disallowed URL protocol: ${parsed.protocol}`
    );
  }
  const privateIpPattern =
    /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|0\.0\.0\.0|0000:)/i;
  if (privateIpPattern.test(parsed.hostname)) {
    throw new BadRequestException(
      'SSRF protection: private/loopback host not allowed'
    );
  }
}

/**
 * ContentIngestionResolver — wires ingestContent mutation to TesseractOcrService.
 * Downloads file content, runs OCR, and returns extracted text with confidence.
 */
@Resolver()
export class ContentIngestionResolver {
  private readonly logger = new Logger(ContentIngestionResolver.name);

  constructor(private readonly ocrService: TesseractOcrService) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId) {
      throw new UnauthorizedException('Auth required');
    }
    return {
      tenantId: ctx.authContext.tenantId,
      userId: ctx.authContext.userId ?? 'unknown',
    };
  }

  @Mutation('ingestContent')
  async ingestContent(
    @Args('file') file: unknown,
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ): Promise<ContentIngestionResultDto> {
    const { tenantId, userId } = this.auth(ctx);
    const contentItemId = randomUUID();
    const warnings: string[] = [];

    this.logger.log(
      { courseId, tenantId, userId, contentItemId },
      '[ContentIngestionResolver] ingestContent started'
    );

    // Extract file URL from the upload argument
    const fileUrl =
      typeof file === 'string'
        ? file
        : ((file as { url?: string })?.url ?? null);

    if (!fileUrl) {
      this.logger.warn(
        { courseId, tenantId, contentItemId },
        '[ContentIngestionResolver] No file URL provided — returning empty'
      );
      return {
        contentItemId,
        extractedText: '',
        aiCaption: null,
        isHandwritten: false,
        ocrMethod: 'NONE',
        ocrConfidence: 1,
        topics: [],
        thumbnailUrl: null,
        estimatedDuration: 0,
        pageCount: null,
        warnings: ['No file URL provided for OCR extraction'],
      };
    }

    // SSRF guard: validate URL before fetching
    try {
      assertSafeUrl(fileUrl);
    } catch (err) {
      this.logger.error(
        { fileUrl, courseId, tenantId },
        '[ContentIngestionResolver] SSRF blocked — unsafe URL'
      );
      throw err;
    }

    // Download file from MinIO / URL
    let imageBuffer: Buffer;
    try {
      const response = await fetch(fileUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      this.logger.error(
        { fileUrl, courseId, tenantId, err: String(err) },
        '[ContentIngestionResolver] File download failed'
      );
      warnings.push(`File download failed: ${String(err)}`);
      return {
        contentItemId,
        extractedText: '',
        aiCaption: null,
        isHandwritten: false,
        ocrMethod: 'NONE',
        ocrConfidence: 0,
        topics: [],
        thumbnailUrl: null,
        estimatedDuration: 0,
        pageCount: null,
        warnings,
      };
    }

    // Run OCR via TesseractOcrService
    let extractedText = '';
    let ocrConfidence = 0;
    try {
      const result = await this.ocrService.extractText(imageBuffer);
      extractedText = result.text;
      ocrConfidence = result.confidence;
      this.logger.log(
        { contentItemId, textLength: extractedText.length, ocrConfidence },
        '[ContentIngestionResolver] OCR extraction complete'
      );
    } catch (err) {
      this.logger.error(
        { contentItemId, err: String(err) },
        '[ContentIngestionResolver] OCR extraction failed — returning partial'
      );
      warnings.push(`OCR extraction failed: ${String(err)}`);
    }

    return {
      contentItemId,
      extractedText,
      aiCaption: null,
      isHandwritten: false,
      ocrMethod: extractedText ? 'TESSERACT' : 'NONE',
      ocrConfidence,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings,
    };
  }
}
