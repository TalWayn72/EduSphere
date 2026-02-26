/**
 * OpenBadge service — issues, verifies and revokes W3C OpenBadges 3.0 credentials (F-025)
 * Ed25519 signatures via Node.js built-in crypto. No external blockchain required.
 * Split: crypto helpers → open-badge.crypto.ts | types → open-badge.types.ts
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  loadKeyPair,
  signCredential,
  verifyCredentialSignature,
} from './open-badge.crypto.js';
import { buildLinkedInShareUrl } from './open-badge.types.js';
import type {
  Ed25519KeyPair,
  IssueCredentialInput,
  CreateBadgeDefinitionInput,
  BadgeAssertionResult,
  VerificationResult,
  Ob3CredentialBody,
  OpenBadgeProof,
} from './open-badge.types.js';

const BASE_URL = process.env.OPENBADGE_BASE_URL ?? 'https://edusphere.io';
const MAX_SUBS = 5;

interface CourseCompletedEvent {
  readonly userId: string;
  readonly tenantId: string;
  readonly courseId: string;
  readonly badgeDefinitionId?: string;
}

@Injectable()
export class OpenBadgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenBadgeService.name);
  private readonly db: Database = createDatabaseConnection();
  keyPair!: Ed25519KeyPair; // loaded once on init; internal for testability
  private nats: NatsConnection | null = null;
  private readonly subs: Subscription[] = [];

  async onModuleInit(): Promise<void> {
    this.keyPair = loadKeyPair();
    this.logger.log('OpenBadgeService: Ed25519 key pair loaded');
    await this.connectNats();
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.subs) sub.unsubscribe();
    this.subs.length = 0;
    if (this.nats) {
      await this.nats.drain().catch(() => undefined);
      this.nats = null;
    }
    await closeAllPools();
    this.logger.log('OpenBadgeService: connections closed');
  }

  private async connectNats(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      if (this.subs.length >= MAX_SUBS) return;
      const sub = this.nats.subscribe('EDUSPHERE.course.completed');
      this.subs.push(sub);
      void this.handleCourseCompletionEvents(sub);
      this.logger.log('OpenBadgeService: NATS subscribed to course.completed');
    } catch (err) {
      this.logger.warn(
        { err },
        'OpenBadgeService: NATS unavailable — auto-issuance disabled'
      );
    }
  }

  private async handleCourseCompletionEvents(sub: Subscription): Promise<void> {
    for await (const msg of sub) {
      try {
        const event = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as CourseCompletedEvent;
        if (!event.badgeDefinitionId) continue;
        await this.issueCredential({
          userId: event.userId,
          tenantId: event.tenantId,
          badgeDefinitionId: event.badgeDefinitionId,
        });
      } catch (err) {
        this.logger.error(
          { err },
          'Failed to auto-issue badge on course completion'
        );
      }
    }
  }

  async issueCredential(
    input: IssueCredentialInput
  ): Promise<BadgeAssertionResult> {
    const ctx: TenantContext = {
      tenantId: input.tenantId,
      userId: input.userId,
      userRole: 'STUDENT',
    };
    return withTenantContext(this.db, ctx, async (tx) => {
      const [def] = await tx
        .select()
        .from(schema.openBadgeDefinitions)
        .where(
          and(
            eq(schema.openBadgeDefinitions.id, input.badgeDefinitionId),
            eq(schema.openBadgeDefinitions.tenantId, input.tenantId)
          )
        )
        .limit(1);
      if (!def)
        throw new NotFoundException(
          `Badge definition ${input.badgeDefinitionId} not found`
        );

      const credentialBody = this.buildCredentialBody(def, input);
      const proof = signCredential(credentialBody, this.keyPair);

      const [assertion] = await tx
        .insert(schema.openBadgeAssertions)
        .values({
          badgeDefinitionId: input.badgeDefinitionId,
          recipientId: input.userId,
          tenantId: input.tenantId,
          expiresAt: input.expiresAt,
          evidenceUrl: input.evidenceUrl,
          proof: proof as unknown as Record<string, unknown>,
        })
        .returning();

      if (!assertion) throw new Error('Assertion insert returned no record');
      this.logger.log(
        { assertionId: assertion.id, userId: input.userId },
        'OpenBadge issued'
      );
      return this.mapAssertion(assertion, def.name, def.description);
    });
  }

  async verifyCredential(assertionId: string): Promise<VerificationResult> {
    const assertion = await this.getAssertionById(assertionId);
    if (!assertion) return { valid: false, error: 'Assertion not found' };
    if (assertion.revoked)
      return { valid: false, error: 'Credential has been revoked' };
    if (assertion.expiresAt && assertion.expiresAt < new Date()) {
      return { valid: false, error: 'Credential has expired' };
    }
    const def = await this.getDefinitionById(assertion.badgeDefinitionId);
    if (!def) return { valid: false, error: 'Badge definition not found' };

    const body = this.buildCredentialBody(def, {
      userId: assertion.recipientId,
      badgeDefinitionId: def.id,
      tenantId: assertion.tenantId,
    });
    const proof = assertion.proof as unknown as OpenBadgeProof;
    const valid = verifyCredentialSignature(
      body,
      proof,
      this.keyPair.publicKey
    );
    if (!valid) return { valid: false, error: 'Signature verification failed' };
    return {
      valid: true,
      assertion: this.mapAssertion(assertion, def.name, def.description),
    };
  }

  async revokeCredential(
    assertionId: string,
    reason: string,
    tenantId: string
  ): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    await withTenantContext(this.db, ctx, async (tx) => {
      const [existing] = await tx
        .select({
          id: schema.openBadgeAssertions.id,
          tenantId: schema.openBadgeAssertions.tenantId,
        })
        .from(schema.openBadgeAssertions)
        .where(eq(schema.openBadgeAssertions.id, assertionId))
        .limit(1);
      if (!existing)
        throw new NotFoundException(`Assertion ${assertionId} not found`);
      if (existing.tenantId !== tenantId)
        throw new ForbiddenException('Cross-tenant revocation denied');
      await tx
        .update(schema.openBadgeAssertions)
        .set({ revoked: true, revokedAt: new Date(), revokedReason: reason })
        .where(eq(schema.openBadgeAssertions.id, assertionId));
    });
    this.logger.log({ assertionId, reason }, 'OpenBadge revoked');
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

  async createBadgeDefinition(
    input: CreateBadgeDefinitionInput,
    tenantId: string,
    issuerId?: string
  ): Promise<typeof schema.openBadgeDefinitions.$inferSelect> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    return withTenantContext(this.db, ctx, async (tx) => {
      const [def] = await tx
        .insert(schema.openBadgeDefinitions)
        .values({
          tenantId,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          criteriaUrl: input.criteriaUrl,
          tags: input.tags ?? [],
          issuerId: issuerId ?? this.keyPair.issuerDid,
        })
        .returning();
      if (!def) throw new Error('Badge definition insert returned no record');
      this.logger.log(
        { defId: def.id, name: def.name },
        'OpenBadge definition created'
      );
      return def;
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

  buildCredentialBody(
    def: typeof schema.openBadgeDefinitions.$inferSelect,
    input: Pick<
      IssueCredentialInput,
      'userId' | 'badgeDefinitionId' | 'tenantId' | 'expiresAt'
    >
  ): Ob3CredentialBody {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      ],
      id: `${BASE_URL}/ob3/assertion/pending`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: {
        id: this.keyPair.issuerDid,
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
