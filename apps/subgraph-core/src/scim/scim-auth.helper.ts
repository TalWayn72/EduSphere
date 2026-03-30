/**
 * ScimAuthHelper — Shared SCIM authentication and error response helpers.
 * Extracted from ScimController to be shared by user and group controllers.
 */
import { Injectable, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ScimTokenService } from './scim-token.service.js';
import type { ScimError } from './scim.types.js';

const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
const SCIM_CT = 'application/scim+json';

@Injectable()
export class ScimAuthHelper {
  constructor(private readonly tokenService: ScimTokenService) {}

  scimError(res: Response, status: number, detail: string): void {
    const body: ScimError = { schemas: [SCIM_ERROR_SCHEMA], status, detail };
    res.status(status).type(SCIM_CT).json(body);
  }

  async authorize(
    req: Request,
    res: Response
  ): Promise<{ tenantId: string; tokenId: string } | null> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      this.scimError(res, HttpStatus.UNAUTHORIZED, 'Bearer token required');
      return null;
    }
    const raw = auth.slice(7);
    const result = await this.tokenService.validateToken(raw);
    if (!result) {
      this.scimError(res, HttpStatus.UNAUTHORIZED, 'Invalid or expired token');
      return null;
    }
    return result;
  }
}
