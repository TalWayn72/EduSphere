/**
 * PartnerApiMiddleware — Phase 56.
 *
 * Authenticates inbound requests on /api/v1/partner/* routes using an
 * API key passed in the Authorization header as "Bearer <key>".
 *
 * Security invariants:
 *   - Key is SHA-256 hashed before DB lookup (raw key never persisted or logged)
 *   - Hash comparison uses timingSafeEqual to prevent timing attacks (SI-8 equivalent)
 *   - Suspended partners receive 401 (same error as not-found — no enumeration)
 *   - Raw key hash is NEVER logged
 */
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { createDatabaseConnection, schema, eq, closeAllPools } from '@edusphere/db';
import type { Database } from '@edusphere/db';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class PartnerApiMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PartnerApiMiddleware.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn({ path: req.path }, 'PARTNER_AUTH_FAILED: missing Bearer token');
      res.status(401).json({ error: 'PARTNER_AUTH_FAILED', message: 'Invalid API key' });
      return;
    }

    const rawKey = authHeader.slice(7);
    const incomingHash = sha256(rawKey);

    const partners = await this.db
      .select({ id: schema.partners.id, status: schema.partners.status, apiKeyHash: schema.partners.apiKeyHash })
      .from(schema.partners)
      .where(eq(schema.partners.apiKeyHash, incomingHash))
      .limit(1);

    const partner = partners[0];

    if (!partner || !safeCompare(partner.apiKeyHash, incomingHash)) {
      this.logger.warn({ path: req.path }, 'PARTNER_AUTH_FAILED: key not found');
      res.status(401).json({ error: 'PARTNER_AUTH_FAILED', message: 'Invalid API key' });
      return;
    }

    if (partner.status === 'suspended') {
      this.logger.warn({ partnerId: partner.id, path: req.path }, 'PARTNER_AUTH_FAILED: suspended');
      res.status(401).json({ error: 'PARTNER_AUTH_FAILED', message: 'Invalid API key' });
      return;
    }

    // Attach partner context for downstream controllers
    (req as Request & { partner: { id: string } }).partner = { id: partner.id };
    next();
  }
}
