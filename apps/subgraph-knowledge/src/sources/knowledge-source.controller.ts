/**
 * KnowledgeSourceController — REST endpoint for file uploads.
 *
 * POST /api/knowledge-sources/upload
 *   Body: multipart/form-data  { file, courseId, title? }
 *   Auth: Authorization: Bearer <jwt>
 *
 * Supports DOCX (.docx), PDF (.pdf), and plain text (.txt) files up to 50 MB.
 * The file is parsed in-memory (no disk write) and injected into the standard
 * createAndProcess pipeline.
 */

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { JWTValidator } from '@edusphere/auth';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import type { SourceType } from '@edusphere/db';

// ─── File type detection ──────────────────────────────────────────────────────

const MIME_TO_SOURCE_TYPE: Record<string, SourceType> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'FILE_DOCX',
  'application/msword': 'FILE_DOCX',
  'application/pdf': 'FILE_PDF',
  'text/plain': 'FILE_TXT',
};

const EXT_TO_SOURCE_TYPE: Record<string, SourceType> = {
  '.docx': 'FILE_DOCX',
  '.doc':  'FILE_DOCX',
  '.pdf':  'FILE_PDF',
  '.txt':  'FILE_TXT',
};

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('api/knowledge-sources')
export class KnowledgeSourceController {
  private readonly logger = new Logger(KnowledgeSourceController.name);

  private readonly jwtValidator = new JWTValidator(
    process.env.KEYCLOAK_URL   ?? 'http://localhost:8080',
    process.env.KEYCLOAK_REALM ?? 'edusphere',
    // No clientId: subgraphs behind the gateway skip audience validation
  );

  constructor(private readonly service: KnowledgeSourceService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),          // file available as req.file.buffer
      limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB hard cap
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { courseId?: string; title?: string },
    @Headers('authorization') authHeader: string | undefined,
  ) {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const token = this.jwtValidator.extractToken(authHeader);
    if (!token) throw new UnauthorizedException('Bearer token required');

    const auth = await this.jwtValidator.validate(token).catch(() => {
      throw new UnauthorizedException('Invalid or expired token');
    });

    if (!auth.tenantId) throw new UnauthorizedException('No tenant claim in token');

    // ── Validation ────────────────────────────────────────────────────────────
    if (!file) throw new BadRequestException('No file uploaded');
    if (!body.courseId) throw new BadRequestException('courseId is required');

    // Detect source type from MIME then fallback to extension
    const ext = '.' + (file.originalname.split('.').pop() ?? '').toLowerCase();
    const sourceType: SourceType =
      MIME_TO_SOURCE_TYPE[file.mimetype] ??
      EXT_TO_SOURCE_TYPE[ext] ??
      (() => { throw new BadRequestException(`Unsupported file type: ${file.mimetype}`); })();

    this.logger.log(
      `Upload: ${file.originalname} (${sourceType}, ${file.size} B) ` +
      `by tenant ${auth.tenantId} for course ${body.courseId}`,
    );

    // ── Process ───────────────────────────────────────────────────────────────
    const source = await this.service.createAndProcess({
      tenantId:   auth.tenantId,
      courseId:   body.courseId,
      title:      body.title ?? file.originalname,
      sourceType,
      origin:     file.originalname,
      fileBuffer: file.buffer,
    });

    return { id: source.id, status: source.status };
  }
}
