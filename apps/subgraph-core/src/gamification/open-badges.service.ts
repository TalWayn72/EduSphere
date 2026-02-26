import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  db,
  openBadgeDefinitions,
  openBadgeAssertions,
  eq,
  and,
} from '@edusphere/db';

const HMAC_KEY =
  process.env.OPEN_BADGES_HMAC_KEY ?? 'edusphere-ob3-dev-key-change-in-prod';

const OB3_CONTEXTS = [
  'https://www.w3.org/2018/credentials/v1',
  'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
] as const;

@Injectable()
export class OpenBadgesService {
  private readonly logger = new Logger(OpenBadgesService.name);

  private buildCredential(
    assertionId: string,
    def: typeof openBadgeDefinitions.$inferSelect,
    recipientId: string,
    issuedAt: string,
    evidenceUrl: string | null
  ): Record<string, unknown> {
    return {
      '@context': OB3_CONTEXTS,
      id: `urn:uuid:${assertionId}`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: { id: def.issuerId, type: 'Profile', name: 'EduSphere' },
      issuanceDate: issuedAt,
      credentialSubject: {
        id: `urn:uuid:${recipientId}`,
        type: 'AchievementSubject',
        achievement: {
          id: `urn:uuid:${def.id}`,
          type: 'Achievement',
          name: def.name,
          description: def.description,
          criteria: { narrative: def.criteriaUrl ?? def.description },
          ...(def.imageUrl ? { image: def.imageUrl } : {}),
        },
        ...(evidenceUrl ? { evidence: [{ id: evidenceUrl }] } : {}),
      },
    };
  }

  private signCredential(credential: Record<string, unknown>): string {
    const payload = JSON.stringify(credential);
    return createHmac('sha256', HMAC_KEY).update(payload).digest('hex');
  }

  async issueBadge(
    badgeDefinitionId: string,
    recipientId: string,
    tenantId: string,
    evidenceUrl?: string
  ): Promise<{
    assertion: typeof openBadgeAssertions.$inferSelect;
    definition: typeof openBadgeDefinitions.$inferSelect;
  }> {
    const [def] = await db
      .select()
      .from(openBadgeDefinitions)
      .where(
        and(
          eq(openBadgeDefinitions.id, badgeDefinitionId),
          eq(openBadgeDefinitions.tenantId, tenantId)
        )
      );
    if (!def) throw new NotFoundException('Badge definition not found');

    const tempId = crypto.randomUUID();
    const issuedAt = new Date().toISOString();
    const credential = this.buildCredential(
      tempId,
      def,
      recipientId,
      issuedAt,
      evidenceUrl ?? null
    );
    const proofValue = this.signCredential(credential);
    const proof = {
      type: 'DataIntegrityProof',
      cryptosuite: 'hmac-sha256',
      created: issuedAt,
      verificationMethod: 'urn:edusphere:hmac-key-1',
      proofPurpose: 'assertionMethod',
      proofValue,
    };

    const [assertion] = await db
      .insert(openBadgeAssertions)
      .values({
        id: tempId,
        badgeDefinitionId,
        recipientId,
        tenantId,
        evidenceUrl: evidenceUrl ?? null,
        proof,
      })
      .returning();

    this.logger.log({ recipientId, badgeDefinitionId }, 'Open Badge issued');
    return { assertion: assertion!, definition: def };
  }

  async myOpenBadges(
    userId: string,
    tenantId: string
  ): Promise<
    Array<{
      assertion: typeof openBadgeAssertions.$inferSelect;
      definition: typeof openBadgeDefinitions.$inferSelect;
    }>
  > {
    const rows = await db
      .select({
        assertion: openBadgeAssertions,
        definition: openBadgeDefinitions,
      })
      .from(openBadgeAssertions)
      .innerJoin(
        openBadgeDefinitions,
        eq(openBadgeAssertions.badgeDefinitionId, openBadgeDefinitions.id)
      )
      .where(
        and(
          eq(openBadgeAssertions.recipientId, userId),
          eq(openBadgeAssertions.tenantId, tenantId)
        )
      );
    return rows;
  }

  async verifyOpenBadge(assertionId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(openBadgeAssertions)
      .where(eq(openBadgeAssertions.id, assertionId));
    if (!row || row.revoked) return false;

    const [def] = await db
      .select()
      .from(openBadgeDefinitions)
      .where(eq(openBadgeDefinitions.id, row.badgeDefinitionId));
    if (!def) return false;

    const proof = row.proof as { proofValue?: string };
    const credential = this.buildCredential(
      assertionId,
      def,
      row.recipientId,
      row.issuedAt.toISOString(),
      row.evidenceUrl ?? null
    );
    const expected = this.signCredential(credential);
    return expected === proof.proofValue;
  }

  async revokeOpenBadge(
    assertionId: string,
    tenantId: string,
    reason: string
  ): Promise<boolean> {
    await db
      .update(openBadgeAssertions)
      .set({ revoked: true, revokedAt: new Date(), revokedReason: reason })
      .where(
        and(
          eq(openBadgeAssertions.id, assertionId),
          eq(openBadgeAssertions.tenantId, tenantId)
        )
      );
    this.logger.log({ assertionId, reason }, 'Open Badge revoked');
    return true;
  }
}
