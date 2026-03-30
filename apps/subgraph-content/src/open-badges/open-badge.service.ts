/**
 * OpenBadge service — issues, verifies and revokes W3C OpenBadges 3.0 credentials (F-025)
 * Ed25519 signatures via Node.js built-in crypto. No external blockchain required.
 * Split: crypto → open-badge.crypto.ts | types → open-badge.types.ts | queries → open-badge-query.service.ts
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  loadKeyPair,
  signCredential,
  verifyCredentialSignature,
} from './open-badge.crypto.js';
import { GraphGroundedCredentialService } from '../certificate/graph-credential.service.js';
import { OpenBadgeQueryService } from './open-badge-query.service.js';
import type {
  Ed25519KeyPair,
  IssueCredentialInput,
  BadgeAssertionResult,
  VerificationResult,
  CreateBadgeDefinitionInput,
} from './open-badge.types.js';

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
  keyPair!: Ed25519KeyPair;
  private nats: NatsConnection | null = null;
  private readonly subs: Subscription[] = [];

  constructor(
    private readonly graphCredentialService: GraphGroundedCredentialService,
    private readonly queryService: OpenBadgeQueryService,
  ) {}

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
      this.logger.warn({ err }, 'OpenBadgeService: NATS unavailable — auto-issuance disabled');
    }
  }

  private async handleCourseCompletionEvents(sub: Subscription): Promise<void> {
    for await (const msg of sub) {
      try {
        const event = JSON.parse(new TextDecoder().decode(msg.data)) as CourseCompletedEvent;
        if (!event.badgeDefinitionId) continue;
        await this.issueCredential({
          userId: event.userId, tenantId: event.tenantId,
          badgeDefinitionId: event.badgeDefinitionId,
        });
      } catch (err) {
        this.logger.error({ err }, 'Failed to auto-issue badge on course completion');
      }
    }
  }

  async issueCredential(input: IssueCredentialInput): Promise<BadgeAssertionResult> {
    const ctx: TenantContext = { tenantId: input.tenantId, userId: input.userId, userRole: 'STUDENT' };
    return withTenantContext(this.queryService.db, ctx, async (tx) => {
      const [def] = await tx.select().from(schema.openBadgeDefinitions)
        .where(and(
          eq(schema.openBadgeDefinitions.id, input.badgeDefinitionId),
          eq(schema.openBadgeDefinitions.tenantId, input.tenantId)
        )).limit(1);
      if (!def) throw new NotFoundException(`Badge definition ${input.badgeDefinitionId} not found`);

      const credentialBody = this.buildCredentialBody(def, input);
      const proof = signCredential(credentialBody, this.keyPair);

      const [assertion] = await tx.insert(schema.openBadgeAssertions).values({
        badgeDefinitionId: input.badgeDefinitionId,
        recipientId: input.userId,
        tenantId: input.tenantId,
        expiresAt: input.expiresAt,
        evidenceUrl: input.evidenceUrl,
        proof: proof as unknown as Record<string, unknown>,
      }).returning();
      if (!assertion) throw new InternalServerErrorException('Assertion insert returned no record');
      this.logger.log({ assertionId: assertion.id, userId: input.userId }, 'OpenBadge issued');
      return this.queryService.mapAssertion(assertion, def.name, def.description);
    });
  }

  async verifyCredential(assertionId: string): Promise<VerificationResult> {
    const assertion = await this.queryService.getAssertionById(assertionId);
    if (!assertion) return { valid: false, error: 'Assertion not found' };
    if (assertion.revoked) return { valid: false, error: 'Credential has been revoked' };
    if (assertion.expiresAt && assertion.expiresAt < new Date()) {
      return { valid: false, error: 'Credential has expired' };
    }
    const def = await this.queryService.getDefinitionById(assertion.badgeDefinitionId);
    if (!def) return { valid: false, error: 'Badge definition not found' };

    const body = this.buildCredentialBody(def, {
      userId: assertion.recipientId, badgeDefinitionId: def.id, tenantId: assertion.tenantId,
    });
    const proof = assertion.proof as unknown as import('./open-badge.types.js').OpenBadgeProof;
    const valid = verifyCredentialSignature(body, proof, this.keyPair.publicKey);
    if (!valid) return { valid: false, error: 'Signature verification failed' };
    return { valid: true, assertion: this.queryService.mapAssertion(assertion, def.name, def.description) };
  }

  async revokeCredential(assertionId: string, reason: string, tenantId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.queryService.db, ctx, async (tx) => {
      const [existing] = await tx.select({
        id: schema.openBadgeAssertions.id, tenantId: schema.openBadgeAssertions.tenantId,
      }).from(schema.openBadgeAssertions).where(eq(schema.openBadgeAssertions.id, assertionId)).limit(1);
      if (!existing) throw new NotFoundException(`Assertion ${assertionId} not found`);
      if (existing.tenantId !== tenantId) throw new ForbiddenException('Cross-tenant revocation denied');
      await tx.update(schema.openBadgeAssertions)
        .set({ revoked: true, revokedAt: new Date(), revokedReason: reason })
        .where(eq(schema.openBadgeAssertions.id, assertionId));
    });
    this.logger.log({ assertionId, reason }, 'OpenBadge revoked');
  }

  // ── Query delegates ──────────────────────────────────────────────────────

  getUserBadges(userId: string, tenantId: string): Promise<BadgeAssertionResult[]> {
    return this.queryService.getUserBadges(userId, tenantId);
  }

  async createBadgeDefinition(
    input: CreateBadgeDefinitionInput, tenantId: string, issuerId?: string
  ): Promise<typeof schema.openBadgeDefinitions.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    return withTenantContext(this.queryService.db, ctx, async (tx) => {
      const [def] = await tx.insert(schema.openBadgeDefinitions).values({
        tenantId, name: input.name, description: input.description,
        imageUrl: input.imageUrl, criteriaUrl: input.criteriaUrl,
        tags: input.tags ?? [], issuerId: issuerId ?? this.keyPair.issuerDid,
      }).returning();
      if (!def) throw new InternalServerErrorException('Badge definition insert returned no record');
      this.logger.log({ defId: def.id, name: def.name }, 'OpenBadge definition created');
      return def;
    });
  }

  getBadgeDefinitions(tenantId: string) {
    return this.queryService.getBadgeDefinitions(tenantId);
  }

  async issueGraphGroundedBadge(
    userId: string, tenantId: string, courseId: string,
    badgeDefinitionId: string, requiredConceptIds: string[]
  ): Promise<BadgeAssertionResult> {
    const coverage = await this.graphCredentialService.verifyKnowledgePathCoverage(
      userId, tenantId, courseId, requiredConceptIds
    );
    if (!coverage.covered) {
      this.logger.warn(
        `[OpenBadgeService] Graph coverage insufficient userId=${userId} score=${coverage.coverageScore}`,
        { tenantId, userId, courseId, coverageScore: coverage.coverageScore },
      );
      throw new BadRequestException(
        `Knowledge graph coverage insufficient: ${Math.round(coverage.coverageScore * 100)}% (required >=70%). ` +
          `Missing concepts: ${coverage.missingConcepts.join(', ')}`
      );
    }
    const assertion = await this.issueCredential({ userId, tenantId, badgeDefinitionId });
    await this.graphCredentialService.recordGraphCredential(userId, tenantId, assertion.id, coverage);
    this.logger.log(
      `[OpenBadgeService] Graph-grounded badge issued assertionId=${assertion.id}`,
      { tenantId, userId, courseId, coverageScore: coverage.coverageScore },
    );
    return assertion;
  }

  getAssertionById(assertionId: string) { return this.queryService.getAssertionById(assertionId); }
  getDefinitionById(definitionId: string) { return this.queryService.getDefinitionById(definitionId); }

  buildCredentialBody(
    def: typeof schema.openBadgeDefinitions.$inferSelect,
    input: Pick<IssueCredentialInput, 'userId' | 'badgeDefinitionId' | 'tenantId' | 'expiresAt'>
  ) {
    return this.queryService.buildCredentialBody(def, input, this.keyPair);
  }

  mapAssertion(
    assertion: typeof schema.openBadgeAssertions.$inferSelect,
    badgeName: string, badgeDescription: string
  ) {
    return this.queryService.mapAssertion(assertion, badgeName, badgeDescription);
  }
}
