/**
 * BiExportController — OData v4 REST endpoints for BI tool integration.
 * Authenticates via Bearer token (API key), extracts tenant, returns OData JSON.
 * Endpoints: GET /odata/v1/$metadata, /Enrollments, /Completions, /QuizResults, /ActivityLog
 */
import { Controller, Get, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BiTokenService } from './bi-token.service.js';
import { BiExportService } from './bi-export.service.js';
import type { ODataParams } from './bi-export.service.js';

const ODATA_CT = 'application/json;odata.metadata=minimal';

const METADATA_DOCUMENT = {
  '@odata.context': 'http://localhost:4002/odata/v1/$metadata',
  value: [
    { name: 'Enrollments', kind: 'EntitySet', url: 'Enrollments' },
    { name: 'Completions', kind: 'EntitySet', url: 'Completions' },
    { name: 'QuizResults', kind: 'EntitySet', url: 'QuizResults' },
    { name: 'ActivityLog', kind: 'EntitySet', url: 'ActivityLog' },
  ],
};

@Controller('odata/v1')
export class BiExportController {
  private readonly logger = new Logger(BiExportController.name);

  constructor(
    private readonly tokenService: BiTokenService,
    private readonly exportService: BiExportService
  ) {}

  private odataError(res: Response, status: number, message: string): void {
    res
      .status(status)
      .type(ODATA_CT)
      .json({
        error: { code: String(status), message },
      });
  }

  private async authorize(req: Request, res: Response): Promise<string | null> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      this.odataError(res, HttpStatus.UNAUTHORIZED, 'Bearer token required');
      return null;
    }
    const raw = auth.slice(7);
    const tenantId = await this.tokenService.validateToken(raw);
    if (!tenantId) {
      this.odataError(res, HttpStatus.UNAUTHORIZED, 'Invalid or expired token');
      return null;
    }
    return tenantId;
  }

  private parseODataParams(req: Request): ODataParams {
    return {
      top: req.query['$top'] ? Number(req.query['$top']) : undefined,
      skip: req.query['$skip'] ? Number(req.query['$skip']) : undefined,
      filter: req.query['$filter'] as string | undefined,
      orderby: req.query['$orderby'] as string | undefined,
    };
  }

  @Get('$metadata')
  getMetadata(@Res() res: Response): void {
    res.status(200).type(ODATA_CT).json(METADATA_DOCUMENT);
  }

  @Get('Enrollments')
  async getEnrollments(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const tenantId = await this.authorize(req, res);
    if (!tenantId) return;
    const params = this.parseODataParams(req);
    const data = await this.exportService.getEnrollments(tenantId, params);
    res.status(200).type(ODATA_CT).json(data);
  }

  @Get('Completions')
  async getCompletions(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const tenantId = await this.authorize(req, res);
    if (!tenantId) return;
    const params = this.parseODataParams(req);
    const data = await this.exportService.getCompletions(tenantId, params);
    res.status(200).type(ODATA_CT).json(data);
  }

  @Get('QuizResults')
  async getQuizResults(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const tenantId = await this.authorize(req, res);
    if (!tenantId) return;
    const params = this.parseODataParams(req);
    const data = await this.exportService.getQuizResults(tenantId, params);
    res.status(200).type(ODATA_CT).json(data);
  }

  @Get('ActivityLog')
  async getActivityLog(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const tenantId = await this.authorize(req, res);
    if (!tenantId) return;
    const params = this.parseODataParams(req);
    const data = await this.exportService.getActivityLog(tenantId, params);
    res.status(200).type(ODATA_CT).json(data);
  }
}
