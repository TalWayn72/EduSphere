/**
 * JargonDomainService
 *
 * CRUD for jargon domains with parent-child hierarchy.
 * Detection and proximity computation delegated to JargonDomainDetectService.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  isNull,
  sql,
} from '@edusphere/db';
import type { JargonDomain, NewJargonDomain } from '@edusphere/db';
import {
  JargonDomainDetectService,
  type DetectedDomainResult,
} from './jargon-domain-detect.service.js';

export type { JargonDomain, DetectedDomainResult };

export interface CreateJargonDomainInput {
  name: string;
  description?: string;
  language?: string;
  parentDomainId?: string;
}

@Injectable()
export class JargonDomainService {
  private readonly logger = new Logger(JargonDomainService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly detectService: JargonDomainDetectService) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  async listDomains(
    tenantId: string,
    language?: string
  ): Promise<JargonDomain[]> {
    const conditions = [
      eq(schema.jargon_domains.tenant_id, tenantId),
      isNull(schema.jargon_domains.deleted_at),
    ];
    if (language) {
      conditions.push(eq(schema.jargon_domains.language, language));
    }
    return this.db
      .select()
      .from(schema.jargon_domains)
      .where(and(...conditions))
      .orderBy(schema.jargon_domains.name);
  }

  async findById(id: string, tenantId: string): Promise<JargonDomain> {
    const [domain] = await this.db
      .select()
      .from(schema.jargon_domains)
      .where(
        and(
          eq(schema.jargon_domains.id, id),
          eq(schema.jargon_domains.tenant_id, tenantId),
          isNull(schema.jargon_domains.deleted_at)
        )
      );
    if (!domain) throw new NotFoundException(`JargonDomain ${id} not found`);
    return domain;
  }

  async countTerms(domainId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.jargon_terms)
      .where(
        and(
          eq(schema.jargon_terms.domain_id, domainId),
          isNull(schema.jargon_terms.deleted_at)
        )
      );
    return row?.count ?? 0;
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  async createDomain(
    tenantId: string,
    input: CreateJargonDomainInput
  ): Promise<JargonDomain> {
    const insert: NewJargonDomain = {
      tenant_id: tenantId,
      name: input.name,
      description: input.description ?? null,
      language: input.language ?? 'he',
      parent_domain_id: input.parentDomainId ?? null,
    };
    try {
      const [created] = await this.db
        .insert(schema.jargon_domains)
        .values(insert)
        .returning();
      this.logger.log(
        { tenantId, domainId: created!.id },
        'Created jargon domain'
      );
      return created!;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(
          `Domain "${input.name}" already exists for tenant`
        );
      }
      throw err;
    }
  }

  // ── Detection (delegated) ────────────────────────────────────────────────

  async detectDomains(
    transcriptText: string,
    tenantId: string
  ): Promise<DetectedDomainResult[]> {
    const allDomains = await this.listDomains(tenantId);
    return this.detectService.detectDomains(
      transcriptText,
      allDomains,
      tenantId
    );
  }

  async computeProximity(tenantId: string): Promise<void> {
    const domains = await this.listDomains(tenantId);
    if (domains.length < 2) return;

    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        // eslint-disable-next-line security/detect-object-injection
        const a = domains[i]!;
        // eslint-disable-next-line security/detect-object-injection
        const b = domains[j]!;
        const score = await this.detectService.computeProximityPair(a.id, b.id);
        if (score === null) continue;

        await this.db
          .insert(schema.domain_proximity)
          .values({
            tenant_id: tenantId,
            domain_a_id: a.id,
            domain_b_id: b.id,
            proximity_score: String(score),
          })
          .onConflictDoUpdate({
            target: [
              schema.domain_proximity.tenant_id,
              schema.domain_proximity.domain_a_id,
              schema.domain_proximity.domain_b_id,
            ],
            set: { proximity_score: String(score) },
          });
      }
    }
    this.logger.log({ tenantId }, 'Domain proximity computation complete');
  }

  async getRelatedDomains(
    domainId: string,
    tenantId: string
  ): Promise<Array<{ domain: JargonDomain; score: number }>> {
    const rows = await this.db
      .select()
      .from(schema.domain_proximity)
      .where(
        and(
          eq(schema.domain_proximity.tenant_id, tenantId),
          eq(schema.domain_proximity.domain_a_id, domainId)
        )
      );

    const results: Array<{ domain: JargonDomain; score: number }> = [];
    for (const row of rows) {
      try {
        const domain = await this.findById(row.domain_b_id, tenantId);
        results.push({ domain, score: Number(row.proximity_score) });
      } catch {
        // domain deleted — skip
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }
}
