/**
 * LrsController — F-028 xAPI 1.0.3 Self-Hosted LRS Endpoint
 *
 * Implements the xAPI 1.0.3 HTTP interface:
 *   POST /xapi/statements  — receive xAPI statements
 *   GET  /xapi/statements  — query xAPI statements
 *   GET  /xapi/about       — LRS metadata (version, extensions)
 *
 * Authentication: Bearer token via XapiTokenService.
 * All responses include X-Experience-API-Version: 1.0.3 header.
 */
import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { XapiTokenService } from './xapi-token.service.js';
import { XapiStatementService } from './xapi-statement.service.js';
import type { XapiStatement, XapiQueryParams } from './xapi.types.js';

const XAPI_VERSION = '1.0.3';
const XAPI_HEADER = 'X-Experience-API-Version';

@Controller('xapi')
export class LrsController {
  private readonly logger = new Logger(LrsController.name);

  constructor(
    private readonly tokenService: XapiTokenService,
    private readonly statementService: XapiStatementService
  ) {}

  private setXapiHeaders(res: Response): void {
    res.setHeader(XAPI_HEADER, XAPI_VERSION);
    res.setHeader('Content-Type', 'application/json');
  }

  private async authorize(
    req: Request,
    res: Response
  ): Promise<{
    tenantId: string;
    tokenId: string;
    lrsEndpoint: string | null;
  } | null> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      this.setXapiHeaders(res);
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'Bearer token required' });
      return null;
    }
    const raw = auth.slice(7);
    const result = await this.tokenService.validateToken(raw);
    if (!result) {
      this.setXapiHeaders(res);
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'Invalid or expired token' });
      return null;
    }
    return result;
  }

  @Get('about')
  getAbout(@Res() res: Response): void {
    this.setXapiHeaders(res);
    res.status(HttpStatus.OK).json({ version: [XAPI_VERSION], extensions: {} });
  }

  private sanitizeString(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  @Post('statements')
  async postStatements(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;

    const body = req.body as unknown;
    const statements: XapiStatement[] = Array.isArray(body)
      ? body
      : [body as XapiStatement];
    const ids: string[] = [];

    for (const stmt of statements) {
      if (!stmt.id || !stmt.actor || !stmt.verb || !stmt.object) {
        this.setXapiHeaders(res);
        res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid xAPI statement: id, actor, verb, object required',
        });
        return;
      }
      await this.statementService.storeStatement(auth.tenantId, stmt);
      ids.push(this.sanitizeString(String(stmt.id)));
    }

    this.logger.log(
      { tenantId: auth.tenantId, count: ids.length },
      'xAPI statements stored via HTTP'
    );
    this.setXapiHeaders(res);
    res.status(HttpStatus.OK).json(ids);
  }

  @Get('statements')
  async getStatements(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;

    const params: XapiQueryParams = {
      limit: req.query['limit'] ? Number(req.query['limit']) : 20,
      since: req.query['since'] ? String(req.query['since']) : undefined,
      until: req.query['until'] ? String(req.query['until']) : undefined,
      verb: req.query['verb'] ? String(req.query['verb']) : undefined,
      agent: req.query['agent'] ? String(req.query['agent']) : undefined,
    };

    const statements = await this.statementService.queryStatements(
      auth.tenantId,
      params
    );
    this.setXapiHeaders(res);
    res.status(HttpStatus.OK).json({
      statements,
      more: '',
    });
  }
}
