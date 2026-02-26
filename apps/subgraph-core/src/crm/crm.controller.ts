/**
 * CrmController — HTTP endpoints for Salesforce OAuth flow + webhook ingestion.
 * Routes:
 *   GET  /crm/salesforce/connect          → redirect to Salesforce OAuth
 *   GET  /crm/salesforce/oauth-callback   → exchange code, save tokens, redirect
 *   POST /crm/salesforce/webhook          → HMAC-verified Salesforce webhook
 *
 * Memory safety: stateMap is bounded at MAX_STATE_ENTRIES with TTL cleanup.
 */
import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
  Body,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CrmService } from './crm.service.js';
import { SalesforceClient } from './salesforce.client.js';

const MAX_STATE_ENTRIES = 100;
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const WEBHOOK_SECRET = process.env['SALESFORCE_WEBHOOK_SECRET'] ?? '';

interface StateEntry {
  tenantId: string;
  createdAt: number;
}

@Controller('crm/salesforce')
export class CrmController {
  private readonly logger = new Logger(CrmController.name);
  private readonly stateMap = new Map<string, StateEntry>();

  constructor(
    private readonly crmService: CrmService,
    private readonly sfClient: SalesforceClient
  ) {}

  @Get('connect')
  connect(@Req() req: Request, @Res() res: Response): void {
    const tenantId =
      (req.headers['x-tenant-id'] as string | undefined) ?? 'unknown';
    const state = crypto.randomUUID();
    this.evictExpiredState();
    if (this.stateMap.size >= MAX_STATE_ENTRIES) {
      // Evict oldest entry (insertion-order)
      const firstKey = this.stateMap.keys().next().value;
      if (firstKey) this.stateMap.delete(firstKey);
    }
    this.stateMap.set(state, { tenantId, createdAt: Date.now() });
    const url = this.sfClient.getAuthorizationUrl(tenantId, state);
    res.redirect(HttpStatus.FOUND, url);
  }

  @Get('oauth-callback')
  async oauthCallback(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const code = (
      Array.isArray(req.query['code'])
        ? req.query['code'][0]
        : req.query['code']
    ) as string | undefined;
    const rawState = (
      Array.isArray(req.query['state'])
        ? req.query['state'][0]
        : req.query['state']
    ) as string | undefined;
    const error = (
      Array.isArray(req.query['error'])
        ? req.query['error'][0]
        : req.query['error']
    ) as string | undefined;

    if (error || !code || !rawState) {
      this.logger.warn(
        { error, rawState },
        'OAuth callback: missing params or error'
      );
      res.redirect('/admin/crm?error=oauth_failed');
      return;
    }

    // state is composed as tenantId:uuid — extract uuid part
    const colonIdx = rawState.indexOf(':');
    const stateKey = colonIdx >= 0 ? rawState.slice(colonIdx + 1) : rawState;
    const entry = this.stateMap.get(stateKey);
    if (!entry || Date.now() - entry.createdAt > STATE_TTL_MS) {
      this.logger.warn(
        { stateKey },
        'OAuth callback: invalid or expired state'
      );
      this.stateMap.delete(stateKey);
      res.redirect('/admin/crm?error=invalid_state');
      return;
    }
    this.stateMap.delete(stateKey);

    try {
      // userId from JWT context — use x-user-id header propagated by gateway
      const userId =
        (req.headers['x-user-id'] as string | undefined) ?? 'unknown';
      await this.crmService.saveConnection(entry.tenantId, code, userId);
      this.logger.log(
        { tenantId: entry.tenantId },
        'Salesforce OAuth connected'
      );
      res.redirect('/admin/crm?connected=true');
    } catch (err) {
      this.logger.error({ err }, 'OAuth callback: failed to save connection');
      res.redirect('/admin/crm?error=token_exchange_failed');
    }
  }

  @Post('webhook')
  async webhook(
    @Req() req: Request,
    @Body() body: unknown,
    @Res() res: Response
  ): Promise<void> {
    const signature =
      (req.headers['x-salesforce-hmac-sha256'] as string | undefined) ?? '';
    const rawBody = JSON.stringify(body);

    if (
      !this.sfClient.verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)
    ) {
      this.logger.warn('Salesforce webhook: invalid HMAC signature');
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      return;
    }

    const tenantId =
      (req.headers['x-tenant-id'] as string | undefined) ?? 'unknown';
    // Respond 200 immediately — process async
    res.status(HttpStatus.OK).json({ received: true });

    void this.crmService
      .enrollUserFromWebhook(tenantId, body)
      .catch((err) =>
        this.logger.error(
          { err, tenantId },
          'Salesforce webhook: enrollment failed'
        )
      );
  }

  private evictExpiredState(): void {
    const now = Date.now();
    for (const [key, entry] of this.stateMap) {
      if (now - entry.createdAt > STATE_TTL_MS) this.stateMap.delete(key);
    }
  }
}
