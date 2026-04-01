/**
 * OpenBadge read queries and OBv3 credential body builder.
 * Extracted from OpenBadgeService for file-size compliance.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { buildLinkedInShareUrl } from './open-badge.types.js';
import type {
  Ed25519KeyPair,
  IssueCredentialInput,
  BadgeAssertionResult,
  Ob3CredentialBody,
  OpenBadgeProof,
} from './open-badge.types.js';

const BASE_URL = process.env.OPENBADGE_BASE_URL ?? 'https://edusphere.io';

@Injectable()
export class OpenBadgeQueryService {
  private readonly logger = new Logger(OpenBadgeQueryService.name);
  readonly db: Database = createDatabaseConnection();

  async getAssertionById(
    assertionId: string
  ): Promise<typeof schema.openBadgeAssertions.$inferSelect | null> {
    const [assertion] = await this.db
      .select()
      .from(schema.openBadgeAssertions)
      .where(eq(schema.openBadgeAssertions.id, assertionId))
      .limit(1);
    return assertion ?? null;
  }

  async getDefinitionById(
    definitionId: string
  ): Promise<typeof schema.openBadgeDefinitions.$inferSelect | null> {
    const [def] = await this.db
      .select()
      .from(schema.openBadgeDefinitions)
      .where(eq(schema.openBadgeDefinitions.id, definitionId))
      .limit(1);
    return def ?? null;
  }

  async getUserBadges(
    userId: string,
    tenantId: string
  ): Promise<BadgeAssertionResult[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          assertion: schema.openBadgeAssertions,
          def: schema.openBadgeDefinitions,
        })
        .from(schema.openBadgeAssertions)
        .innerJoin(
          schema.openBadgeDefinitions,
          eq(
            schema.openBadgeAssertions.badgeDefinitionId,
            schema.openBadgeDefinitions.id
          )
        )
        .where(
          and(
            eq(schema.openBadgeAssertions.recipientId, userId),
            eq(schema.openBadgeAssertions.tenantId, tenantId),
            eq(schema.openBadgeAssertions.revoked, false)
          )
        );
      return rows.map((r) =>
        this.mapAssertion(r.assertion, r.def.name, r.def.description)
      );
    });
  }

  async getBadgeDefinitions(
    tenantId: string
  ): Promise<(typeof schema.openBadgeDefinitions.$inferSelect)[]> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.openBadgeDefinitions)
        .where(eq(schema.openBadgeDefinitions.tenantId, tenantId))
    );
  }

  buildCredentialBody(
    def: typeof schema.openBadgeDefinitions.$inferSelect,
    input: Pick<
      IssueCredentialInput,
      'userId' | 'badgeDefinitionId' | 'tenantId' | 'expiresAt'
    >,
    keyPair: Ed25519KeyPair
  ): Ob3CredentialBody {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      ],
      id: `${BASE_URL}/ob3/assertion/pending`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: {
        id: keyPair.issuerDid,
        type: 'Profile',
        name: 'EduSphere',
      },
      issuanceDate: new Date().toISOString(),
      ...(input.expiresAt
        ? { expirationDate: input.expiresAt.toISOString() }
        : {}),
      credentialSubject: {
        id: `did:example:${input.userId}`,
        type: ['AchievementSubject'],
        achievement: {
          id: `${BASE_URL}/ob3/badge/${def.id}`,
          type: ['Achievement'],
          name: def.name,
          description: def.description,
          criteria: {
            narrative: def.criteriaUrl ?? `${BASE_URL}/ob3/badge/${def.id}`,
          },
          ...(def.imageUrl
            ? { image: { id: def.imageUrl, type: 'Image' as const } }
            : {}),
        },
      },
    };
  }

  mapAssertion(
    assertion: typeof schema.openBadgeAssertions.$inferSelect,
    badgeName: string,
    badgeDescription: string
  ): BadgeAssertionResult {
    const verifyUrl = `${BASE_URL}/ob3/assertion/${assertion.id}`;
    return {
      id: assertion.id,
      badgeDefinitionId: assertion.badgeDefinitionId,
      badgeName,
      badgeDescription,
      recipientId: assertion.recipientId,
      issuedAt: assertion.issuedAt.toISOString(),
      expiresAt: assertion.expiresAt?.toISOString() ?? null,
      evidenceUrl: assertion.evidenceUrl ?? null,
      revoked: assertion.revoked,
      verifyUrl,
      shareUrl: buildLinkedInShareUrl(
        badgeName,
        assertion.issuedAt.toISOString(),
        verifyUrl
      ),
      proof: assertion.proof as unknown as OpenBadgeProof,
    };
  }
}
