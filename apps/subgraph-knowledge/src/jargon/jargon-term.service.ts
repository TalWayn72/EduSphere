/**
 * JargonTermService
 *
 * CRUD for jargon terms: creation, bulk import, embedding generation,
 * and pgvector similarity + ILIKE hybrid search.
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
  ilike,
  sql,
  inArray,
} from '@edusphere/db';
import type { JargonTerm, NewJargonTerm } from '@edusphere/db';
import { EmbeddingProviderService } from '../embedding/embedding-provider.service.js';

export type { JargonTerm };

export interface AddJargonTermInput {
  domainId: string;
  canonicalForm: string;
  phoneticHint?: string;
  altForms?: string[];
  definitionShort?: string;
  language?: string;
}

@Injectable()
export class JargonTermService {
  private readonly logger = new Logger(JargonTermService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly embeddingProvider: EmbeddingProviderService) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  async listByDomain(
    domainId: string,
    tenantId: string,
    limit = 50
  ): Promise<JargonTerm[]> {
    return this.db
      .select()
      .from(schema.jargon_terms)
      .where(
        and(
          eq(schema.jargon_terms.domain_id, domainId),
          eq(schema.jargon_terms.tenant_id, tenantId),
          isNull(schema.jargon_terms.deleted_at)
        )
      )
      .limit(limit)
      .orderBy(schema.jargon_terms.canonical_form);
  }

  async findById(id: string, tenantId: string): Promise<JargonTerm> {
    const [term] = await this.db
      .select()
      .from(schema.jargon_terms)
      .where(
        and(
          eq(schema.jargon_terms.id, id),
          eq(schema.jargon_terms.tenant_id, tenantId),
          isNull(schema.jargon_terms.deleted_at)
        )
      );
    if (!term) throw new NotFoundException(`JargonTerm ${id} not found`);
    return term;
  }

  async findByIds(ids: string[], tenantId: string): Promise<JargonTerm[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(schema.jargon_terms)
      .where(
        and(
          inArray(schema.jargon_terms.id, ids),
          eq(schema.jargon_terms.tenant_id, tenantId),
          isNull(schema.jargon_terms.deleted_at)
        )
      );
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  async addTerm(
    tenantId: string,
    input: AddJargonTermInput
  ): Promise<JargonTerm> {
    const insert: NewJargonTerm = {
      tenant_id: tenantId,
      domain_id: input.domainId,
      canonical_form: input.canonicalForm,
      phonetic_hint: input.phoneticHint ?? null,
      alt_forms: input.altForms ?? [],
      definition_short: input.definitionShort ?? null,
      language: input.language ?? 'he',
      source: 'MANUAL',
    };
    try {
      const [created] = await this.db
        .insert(schema.jargon_terms)
        .values(insert)
        .returning();
      this.logger.log(
        { tenantId, termId: created!.id },
        'Added jargon term'
      );
      // Fire-and-forget embedding generation
      this.generateEmbedding(created!.id).catch((err) =>
        this.logger.warn(
          { err, termId: created!.id },
          'Background embedding failed'
        )
      );
      return created!;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(
          `Term "${input.canonicalForm}" already exists in domain`
        );
      }
      throw err;
    }
  }

  async bulkImport(
    tenantId: string,
    domainId: string,
    terms: AddJargonTermInput[]
  ): Promise<number> {
    if (terms.length === 0) return 0;
    const inserts: NewJargonTerm[] = terms.map((t) => ({
      tenant_id: tenantId,
      domain_id: domainId,
      canonical_form: t.canonicalForm,
      phonetic_hint: t.phoneticHint ?? null,
      alt_forms: t.altForms ?? [],
      definition_short: t.definitionShort ?? null,
      language: t.language ?? 'he',
      source: 'IMPORTED' as const,
    }));

    const inserted = await this.db
      .insert(schema.jargon_terms)
      .values(inserts)
      .onConflictDoNothing()
      .returning({ id: schema.jargon_terms.id });

    this.logger.log(
      { tenantId, domainId, count: inserted.length },
      'Bulk imported jargon terms'
    );

    // Generate embeddings asynchronously
    setImmediate(() => {
      inserted.forEach(({ id }) =>
        this.generateEmbedding(id).catch((err) =>
          this.logger.warn({ err, termId: id }, 'Bulk embedding failed')
        )
      );
    });

    return inserted.length;
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async searchTerms(
    domainId: string,
    tenantId: string,
    query: string,
    limit = 50
  ): Promise<JargonTerm[]> {
    const ilikeResults = await this.db
      .select()
      .from(schema.jargon_terms)
      .where(
        and(
          eq(schema.jargon_terms.domain_id, domainId),
          eq(schema.jargon_terms.tenant_id, tenantId),
          isNull(schema.jargon_terms.deleted_at),
          ilike(schema.jargon_terms.canonical_form, `%${query}%`)
        )
      )
      .limit(limit);

    if (ilikeResults.length >= limit || !this.embeddingProvider.hasProvider()) {
      return ilikeResults;
    }

    // Supplement with pgvector similarity
    try {
      const queryEmbedding =
        await this.embeddingProvider.generateEmbedding(query);
      const vectorStr = `[${queryEmbedding.join(',')}]`;

      const vectorRows = await this.db.execute<{ term_id: string }>(sql`
        SELECT jte.term_id
        FROM jargon_term_embeddings jte
        INNER JOIN jargon_terms jt ON jt.id = jte.term_id
        WHERE jt.domain_id = ${domainId}
          AND jt.tenant_id = ${tenantId}
          AND jt.deleted_at IS NULL
        ORDER BY jte.embedding <=> ${vectorStr}::vector
        LIMIT ${limit}
      `);

      const vectorIds = vectorRows.rows.map((r) => r.term_id);
      const existingIds = new Set(ilikeResults.map((t) => t.id));
      const newIds = vectorIds.filter((id) => !existingIds.has(id));

      if (newIds.length > 0) {
        const extra = await this.findByIds(newIds, tenantId);
        return [...ilikeResults, ...extra].slice(0, limit);
      }
    } catch (err) {
      this.logger.warn(
        { err, domainId },
        'Vector search fallback failed — using ILIKE only'
      );
    }

    return ilikeResults;
  }

  // ── Embedding ─────────────────────────────────────────────────────────────

  async generateEmbedding(termId: string): Promise<void> {
    if (!this.embeddingProvider.hasProvider()) return;

    const [term] = await this.db
      .select()
      .from(schema.jargon_terms)
      .where(eq(schema.jargon_terms.id, termId));

    if (!term) return;

    const altForms = Array.isArray(term.alt_forms) ? term.alt_forms as string[] : [];
    const text = [term.canonical_form, ...altForms].join(' ');

    try {
      const embedding = await this.embeddingProvider.generateEmbedding(text);
      await this.db
        .insert(schema.jargon_term_embeddings)
        .values({ term_id: termId, embedding })
        .onConflictDoUpdate({
          target: [schema.jargon_term_embeddings.term_id],
          set: { embedding },
        });
      this.logger.debug({ termId }, 'Jargon term embedding generated');
    } catch (err) {
      this.logger.error(
        { err, termId },
        'Failed to generate jargon term embedding'
      );
    }
  }
}
