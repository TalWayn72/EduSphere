/**
 * GlossaryService — CRUD for glossary entries.
 * get-or-create, list by domain, search, wiki update, publish.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  ilike,
  or,
} from '@edusphere/db';
import type { GlossaryEntry, NewGlossaryEntry } from '@edusphere/db';

export type { GlossaryEntry };

@Injectable()
export class GlossaryService {
  private readonly logger = new Logger(GlossaryService.name);
  private readonly db = createDatabaseConnection();

  /** Get existing entry by termId, or auto-create an unpublished one. */
  async getByTermId(tenantId: string, termId: string): Promise<GlossaryEntry> {
    const [existing] = await this.db
      .select()
      .from(schema.glossary_entries)
      .where(
        and(
          eq(schema.glossary_entries.tenant_id, tenantId),
          eq(schema.glossary_entries.term_id, termId)
        )
      );
    if (existing) return existing;

    const insert: NewGlossaryEntry = {
      tenant_id: tenantId,
      term_id: termId,
      is_published: false,
    };
    const [created] = await this.db
      .insert(schema.glossary_entries)
      .values(insert)
      .returning();
    this.logger.log({ tenantId, termId }, 'Auto-created glossary entry');
    return created!;
  }

  /** List published entries for a domain (join via jargon_terms). */
  async getByDomainId(
    tenantId: string,
    domainId: string,
    limit = 50
  ): Promise<GlossaryEntry[]> {
    return this.db
      .select({ entry: schema.glossary_entries })
      .from(schema.glossary_entries)
      .innerJoin(
        schema.jargon_terms,
        eq(schema.glossary_entries.term_id, schema.jargon_terms.id)
      )
      .where(
        and(
          eq(schema.glossary_entries.tenant_id, tenantId),
          eq(schema.glossary_entries.is_published, true),
          eq(schema.jargon_terms.domain_id, domainId)
        )
      )
      .limit(limit)
      .then((rows) => rows.map((r) => r.entry));
  }

  /** ILIKE search on term canonical_form and wiki_content. */
  async search(
    tenantId: string,
    query: string,
    limit = 20
  ): Promise<GlossaryEntry[]> {
    const pattern = `%${query}%`;
    return this.db
      .select({ entry: schema.glossary_entries })
      .from(schema.glossary_entries)
      .innerJoin(
        schema.jargon_terms,
        eq(schema.glossary_entries.term_id, schema.jargon_terms.id)
      )
      .where(
        and(
          eq(schema.glossary_entries.tenant_id, tenantId),
          or(
            ilike(schema.jargon_terms.canonical_form, pattern),
            ilike(schema.glossary_entries.wiki_content, pattern)
          )
        )
      )
      .limit(limit)
      .then((rows) => rows.map((r) => r.entry));
  }

  /** Update wiki markdown content. */
  async updateWiki(
    tenantId: string,
    termId: string,
    wikiContent: string
  ): Promise<GlossaryEntry> {
    const entry = await this.getByTermId(tenantId, termId);
    const [updated] = await this.db
      .update(schema.glossary_entries)
      .set({ wiki_content: wikiContent })
      .where(eq(schema.glossary_entries.id, entry.id))
      .returning();
    if (!updated)
      throw new NotFoundException(`GlossaryEntry ${entry.id} not found`);
    this.logger.log({ tenantId, termId }, 'Updated glossary wiki');
    return updated;
  }

  /** Set is_published = true. */
  async publish(tenantId: string, termId: string): Promise<GlossaryEntry> {
    const entry = await this.getByTermId(tenantId, termId);
    const [updated] = await this.db
      .update(schema.glossary_entries)
      .set({ is_published: true })
      .where(eq(schema.glossary_entries.id, entry.id))
      .returning();
    if (!updated)
      throw new NotFoundException(`GlossaryEntry ${entry.id} not found`);
    this.logger.log({ tenantId, termId }, 'Published glossary entry');
    return updated;
  }

  /** Persist LLM-aggregated definition text. */
  async saveAggregatedDefinition(
    tenantId: string,
    termId: string,
    aggregatedDefinition: string
  ): Promise<GlossaryEntry> {
    const entry = await this.getByTermId(tenantId, termId);
    const [updated] = await this.db
      .update(schema.glossary_entries)
      .set({ aggregated_definition: aggregatedDefinition })
      .where(eq(schema.glossary_entries.id, entry.id))
      .returning();
    if (!updated)
      throw new NotFoundException(`GlossaryEntry ${entry.id} not found`);
    return updated;
  }
}
