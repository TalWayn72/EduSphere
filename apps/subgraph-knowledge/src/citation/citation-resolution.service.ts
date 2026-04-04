/**
 * CitationResolutionService — resolves citation candidates against the
 * knowledge graph (Apache AGE) and knowledge_sources table.
 *
 * For each citation candidate:
 * 1. Fuzzy-match bookName against Source nodes in the graph
 * 2. Fetch raw_content from knowledge_sources
 * 3. Extract relevant passage (part/page/column match)
 * 4. Update lesson_citations with resolved data
 */
import { Injectable, Logger } from '@nestjs/common';
import { eq, and, ilike } from 'drizzle-orm';
import { db, schema, withTenantContext } from '@edusphere/db';
import { CypherSourceService } from '../graph/cypher-source.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CitationCandidate {
  readonly bookName: string;
  readonly part?: string;
  readonly page?: string;
  readonly column?: string;
  readonly paragraph?: string;
  readonly originalText: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly confidence: number;
  readonly segmentId?: string;
}

export interface ResolvedCitation {
  readonly candidate: CitationCandidate;
  readonly matchStatus: 'VERIFIED' | 'UNVERIFIED';
  readonly resolvedText?: string;
  readonly knowledgeSourceId?: string;
  readonly graphSourceId?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CitationResolutionService {
  private readonly logger = new Logger(CitationResolutionService.name);

  constructor(private readonly cypherSourceService: CypherSourceService) {}

  /**
   * Resolves an array of citation candidates against the knowledge graph
   * and knowledge_sources table.
   */
  async resolveCandidates(
    candidates: CitationCandidate[],
    lessonId: string,
    tenantId: string
  ): Promise<ResolvedCitation[]> {
    const results: ResolvedCitation[] = [];

    for (const candidate of candidates) {
      try {
        const resolved = await this.resolveOne(candidate, tenantId);
        results.push(resolved);
      } catch (err) {
        this.logger.error(
          { err, bookName: candidate.bookName, lessonId },
          'Failed to resolve citation — marking as UNVERIFIED'
        );
        results.push({
          candidate,
          matchStatus: 'UNVERIFIED',
        });
      }
    }

    const verified = results.filter((r) => r.matchStatus === 'VERIFIED').length;
    this.logger.log(
      {
        lessonId,
        tenantId,
        total: candidates.length,
        verified,
        unverified: candidates.length - verified,
      },
      'Citation resolution complete'
    );

    return results;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async resolveOne(
    candidate: CitationCandidate,
    tenantId: string
  ): Promise<ResolvedCitation> {
    // Step 1: Find matching Source node in Apache AGE graph
    const graphSource = await this.cypherSourceService.findSourceByTitleFuzzy(
      candidate.bookName,
      tenantId
    );

    if (!graphSource) {
      this.logger.debug(
        { bookName: candidate.bookName, tenantId },
        'No graph Source node found for book'
      );
      return { candidate, matchStatus: 'UNVERIFIED' };
    }

    const graphSourceId = (graphSource as Record<string, string>).id;

    // Step 2: Fetch knowledge_source by graph source ID
    const ks = await withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
      async (txDb) => {
        const rows = await txDb
          .select()
          .from(schema.knowledgeSources)
          .where(
            and(
              eq(schema.knowledgeSources.tenant_id, tenantId),
              ilike(schema.knowledgeSources.title, `%${candidate.bookName}%`)
            )
          )
          .limit(1);
        return rows[0] ?? null;
      }
    );

    if (!ks?.raw_content) {
      return {
        candidate,
        matchStatus: 'UNVERIFIED',
        graphSourceId,
      };
    }

    // Step 3: Extract relevant passage
    const passage = this.extractPassage(ks.raw_content, candidate);

    return {
      candidate,
      matchStatus: passage ? 'VERIFIED' : 'UNVERIFIED',
      resolvedText: passage ?? undefined,
      knowledgeSourceId: ks.id,
      graphSourceId,
    };
  }

  /**
   * Attempts to find the referenced passage within the source text
   * using part/page/column indicators as search markers.
   */
  private extractPassage(
    rawContent: string,
    candidate: CitationCandidate
  ): string | null {
    const markers = [
      candidate.part,
      candidate.page,
      candidate.column,
      candidate.paragraph,
    ].filter(Boolean) as string[];

    if (markers.length === 0) {
      // Return first 500 chars as a generic excerpt
      return rawContent.slice(0, 500);
    }

    // Find the position of the most specific marker
    let bestIdx = -1;
    for (const marker of markers) {
      const idx = rawContent.indexOf(marker);
      if (idx !== -1) {
        bestIdx = Math.max(bestIdx, idx);
      }
    }

    if (bestIdx === -1) {
      return null;
    }

    // Extract ~500 chars around the found marker
    const start = Math.max(0, bestIdx - 100);
    const end = Math.min(rawContent.length, bestIdx + 400);
    return rawContent.slice(start, end).trim();
  }
}
