/**
 * JargonDetectionService
 *
 * Multi-pattern matching on transcript segments to detect jargon occurrences.
 * Uses direct string matching for Hebrew and pgvector fuzzy match for abbreviations.
 * Can also discover new recurring unrecognized patterns.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, and, sql } from '@edusphere/db';
import type {
  JargonTerm,
  JargonOccurrence,
  NewJargonOccurrence,
} from '@edusphere/db';
import { EmbeddingProviderService } from '../embedding/embedding-provider.service.js';
import { JargonTermService } from './jargon-term.service.js';

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface DetectedOccurrence {
  termId: string;
  lessonId: string;
  segmentId: string;
  startTime: number;
  endTime: number;
  originalText: string;
  correctedText: string;
}

export interface SuggestedTerm {
  pattern: string;
  occurrenceCount: number;
  exampleContext: string;
}

@Injectable()
export class JargonDetectionService {
  private readonly logger = new Logger(JargonDetectionService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly termService: JargonTermService,
    private readonly embeddingProvider: EmbeddingProviderService
  ) {}

  /**
   * Core detection algorithm: scan segments for jargon matches.
   * Persists occurrences and returns them.
   */
  async detectJargon(
    segments: TranscriptSegment[],
    domainIds: string[],
    tenantId: string,
    lessonId: string
  ): Promise<JargonOccurrence[]> {
    const terms = await this.loadTermsForDomains(domainIds, tenantId);
    if (terms.length === 0) return [];

    const newOccurrences: NewJargonOccurrence[] = [];

    for (const segment of segments) {
      const matches = this.matchTermsInSegment(segment.text, terms);

      for (const match of matches) {
        newOccurrences.push({
          lesson_id: lessonId,
          term_id: match.term.id,
          segment_id: segment.id,
          start_time: String(segment.startTime),
          end_time: String(segment.endTime),
          original_text: match.original,
          corrected_text: match.corrected ?? null,
          confidence: String(match.confidence),
        });
      }

      // Handle unrecognized Hebrew abbreviations via pgvector
      const abbreviations = this.extractAbbreviations(segment.text);
      for (const abbr of abbreviations) {
        const fuzzyMatch = await this.fuzzyMatchAbbreviation(
          abbr,
          terms,
          tenantId
        );
        if (fuzzyMatch) {
          newOccurrences.push({
            lesson_id: lessonId,
            term_id: fuzzyMatch.term.id,
            segment_id: segment.id,
            start_time: String(segment.startTime),
            end_time: String(segment.endTime),
            original_text: abbr,
            corrected_text: fuzzyMatch.term.canonical_form,
            confidence: String(fuzzyMatch.confidence),
          });
        }
      }
    }

    if (newOccurrences.length === 0) return [];

    const inserted = await this.db
      .insert(schema.jargon_occurrences)
      .values(newOccurrences)
      .onConflictDoNothing()
      .returning();

    this.logger.log(
      { lessonId, tenantId, count: inserted.length },
      'Jargon occurrences persisted'
    );

    return inserted;
  }

  async listForLesson(
    lessonId: string,
    _tenantId: string
  ): Promise<JargonOccurrence[]> {
    return this.db
      .select()
      .from(schema.jargon_occurrences)
      .where(eq(schema.jargon_occurrences.lesson_id, lessonId));
  }

  /**
   * Discover recurring unrecognized patterns — candidates for new terms.
   */
  async discoverNewTerms(
    segments: TranscriptSegment[],
    existingTermIds: string[]
  ): Promise<SuggestedTerm[]> {
    const patternMap = new Map<string, { count: number; example: string }>();
    const existingSet = new Set(existingTermIds);

    for (const segment of segments) {
      // Hebrew words of 3+ chars that look like technical terms (no spaces)
      const hebrewWordRe = /[\u05d0-\u05ea]{3,}/g;
      let match: RegExpExecArray | null;
      while ((match = hebrewWordRe.exec(segment.text)) !== null) {
        const word = match[0];
        if (existingSet.has(word)) continue;
        const existing = patternMap.get(word) ?? {
          count: 0,
          example: segment.text,
        };
        patternMap.set(word, {
          count: existing.count + 1,
          example: existing.example,
        });
      }
    }

    return Array.from(patternMap.entries())
      .filter(([, v]) => v.count >= 3)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 20)
      .map(([pattern, v]) => ({
        pattern,
        occurrenceCount: v.count,
        exampleContext: v.example,
      }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async loadTermsForDomains(
    domainIds: string[],
    tenantId: string
  ): Promise<JargonTerm[]> {
    // Also include nearby domains (proximity > 0.5)
    const nearbyRows = await this.db
      .select({ domain_b_id: schema.domain_proximity.domain_b_id })
      .from(schema.domain_proximity)
      .where(
        and(
          eq(schema.domain_proximity.tenant_id, tenantId),
          sql`${schema.domain_proximity.domain_a_id} = ANY(${sql.raw(`'{${domainIds.join(',')}}'::uuid[]`)})`
        )
      );

    const allDomainIds = [
      ...domainIds,
      ...nearbyRows.map((r) => r.domain_b_id),
    ];
    const uniqueDomainIds = [...new Set(allDomainIds)];

    const terms: JargonTerm[] = [];
    for (const domainId of uniqueDomainIds) {
      const domainTerms = await this.termService.listByDomain(
        domainId,
        tenantId,
        500
      );
      terms.push(...domainTerms);
    }
    return terms;
  }

  private matchTermsInSegment(
    text: string,
    terms: JargonTerm[]
  ): Array<{
    term: JargonTerm;
    original: string;
    corrected?: string;
    confidence: number;
  }> {
    const matches: Array<{
      term: JargonTerm;
      original: string;
      corrected?: string;
      confidence: number;
    }> = [];
    const lowerText = text.toLowerCase();

    for (const term of terms) {
      const forms = [
        term.canonical_form,
        ...(Array.isArray(term.alt_forms) ? (term.alt_forms as string[]) : []),
      ];
      for (const form of forms) {
        if (form.length < 2) continue;
        const idx = lowerText.indexOf(form.toLowerCase());
        if (idx !== -1) {
          const originalSlice = text.slice(idx, idx + form.length);
          matches.push({
            term,
            original: originalSlice,
            corrected:
              originalSlice !== term.canonical_form
                ? term.canonical_form
                : undefined,
            confidence: form === term.canonical_form ? 1.0 : 0.85,
          });
          break; // Only one match per term per segment
        }
      }
    }
    return matches;
  }

  private extractAbbreviations(text: string): string[] {
    const found: string[] = [];
    let match: RegExpExecArray | null;
    const re = /[\u05d0-\u05ea]"[\u05d0-\u05ea]/g;
    while ((match = re.exec(text)) !== null) {
      found.push(match[0]);
    }
    return found;
  }

  private async fuzzyMatchAbbreviation(
    abbr: string,
    terms: JargonTerm[],
    _tenantId: string
  ): Promise<{ term: JargonTerm; confidence: number } | null> {
    if (!this.embeddingProvider.hasProvider()) return null;

    try {
      const embedding = await this.embeddingProvider.generateEmbedding(abbr);
      const vectorStr = `[${embedding.join(',')}]`;

      const termIds = terms.map((t) => t.id);
      if (termIds.length === 0) return null;

      const rows = await this.db.execute<{
        term_id: string;
        similarity: string;
      }>(sql`
        SELECT jte.term_id,
               1 - (jte.embedding <=> ${vectorStr}::vector) AS similarity
        FROM jargon_term_embeddings jte
        WHERE jte.term_id = ANY(${termIds}::uuid[])
        ORDER BY jte.embedding <=> ${vectorStr}::vector
        LIMIT 1
      `);

      if (rows.rows.length === 0) return null;
      const top = rows.rows[0]!;
      const similarity = parseFloat(top.similarity);
      if (similarity < 0.75) return null;

      const matched = terms.find((t) => t.id === top.term_id);
      return matched ? { term: matched, confidence: similarity } : null;
    } catch (err) {
      this.logger.debug({ err, abbr }, 'Fuzzy abbreviation match skipped');
      return null;
    }
  }
}
