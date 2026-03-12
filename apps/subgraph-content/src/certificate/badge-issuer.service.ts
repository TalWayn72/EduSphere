/**
 * BadgeIssuerService — Phase 61 (OpenBadges 3.0 / W3C Verifiable Credentials stub).
 *
 * Issues badge assertions as simplified VC JSON (W3C VC Data Model shape).
 * Signature: SHA-256(BADGE_PRIVATE_KEY + userId + courseId + issuedAt).
 * Full Ed25519 signing deferred to Phase 65 (requires crypto key management infra).
 *
 * Memory safety: OnModuleDestroy implemented.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface BadgeVC {
  '@context': string[];
  type: string[];
  id: string;
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    achievement: {
      id: string;
      type: string;
      name: string;
      description: string;
    };
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofValue: string;
  };
}

@Injectable()
export class BadgeIssuerService implements OnModuleDestroy {
  private readonly logger = new Logger(BadgeIssuerService.name);
  private readonly db: Database;
  private readonly issuerDid = 'did:web:edusphere.ai';

  constructor() {
    this.db = createDatabaseConnection();
  }

  onModuleDestroy(): void {
    void closeAllPools();
  }

  async issueBadge(
    userId: string,
    courseId: string,
    _ctx: TenantContext,
  ): Promise<BadgeVC> {
    const issuedAt = new Date().toISOString();
    const assertionId = `urn:uuid:${this.generateId(userId, courseId)}`;

    const proofValue = this.signBadge(userId, courseId, issuedAt);

    const vc: BadgeVC = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      ],
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      id: assertionId,
      issuer: this.issuerDid,
      issuanceDate: issuedAt,
      credentialSubject: {
        id: `did:user:${userId}`,
        achievement: {
          id: `${this.issuerDid}/courses/${courseId}`,
          type: 'Achievement',
          name: 'Course Completion',
          description: `Completed course ${courseId}`,
        },
      },
      proof: {
        type: 'SHA256Proof2024',
        created: issuedAt,
        verificationMethod: `${this.issuerDid}#key-1`,
        proofValue,
      },
    };

    this.logger.log({ userId, courseId, assertionId }, 'Badge issued');
    return vc;
  }

  verifyBadge(vc: BadgeVC): boolean {
    try {
      const userId = vc.credentialSubject.id.replace('did:user:', '');
      const courseId =
        vc.credentialSubject.achievement.id.split('/').pop() ?? '';
      const expected = this.signBadge(userId, courseId, vc.issuanceDate);
      const valid = expected === vc.proof.proofValue;
      this.logger.log({ valid, vcId: vc.id }, 'Badge verification result');
      return valid;
    } catch {
      return false;
    }
  }

  /**
   * Look up the proof stored on an existing badge assertion record.
   * Returns null if the assertion is not found.
   */
  async getProofForAssertion(
    assertionId: string,
    ctx: TenantContext,
  ): Promise<BadgeVC['proof'] | null> {
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ proof: schema.openBadgeAssertions.proof })
        .from(schema.openBadgeAssertions)
        .where(eq(schema.openBadgeAssertions.id, assertionId))
        .limit(1),
    );

    const raw = rows[0]?.proof;
    if (!raw) return null;

    return raw as BadgeVC['proof'];
  }

  private signBadge(
    userId: string,
    courseId: string,
    issuedAt: string,
  ): string {
    const key = process.env['BADGE_PRIVATE_KEY'] ?? 'dev-key';
    return createHash('sha256')
      .update(`${key}:${userId}:${courseId}:${issuedAt}`)
      .digest('hex');
  }

  private generateId(userId: string, courseId: string): string {
    return createHash('sha256')
      .update(`${userId}:${courseId}:${Date.now()}`)
      .digest('hex')
      .slice(0, 36)
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  }
}
