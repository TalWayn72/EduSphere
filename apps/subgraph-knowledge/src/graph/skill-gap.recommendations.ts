/**
 * SkillGapRecommendations — resolves content recommendations for each gap concept.
 * Extracted from SkillGapService to respect the 150-line guideline.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, sql } from '@edusphere/db';
import { EmbeddingService } from '../embedding/embedding.service';
import type { SkillGapItem } from './skill-gap.service';

const RECS_PER_CONCEPT = 3;

@Injectable()
export class SkillGapRecommendations {
  private readonly logger = new Logger(SkillGapRecommendations.name);

  constructor(private readonly embeddingService: EmbeddingService) {}

  async buildGapItems(gapConcepts: string[], tenantId: string): Promise<SkillGapItem[]> {
    return Promise.all(
      gapConcepts.map(async (conceptName) => {
        let recommendedContentItems: string[] = [];
        let recommendedContentTitles: string[] = [];
        let relevanceScore = 0;

        try {
          const results = await this.embeddingService.semanticSearch(
            conceptName,
            tenantId,
            RECS_PER_CONCEPT,
          );
          recommendedContentItems = results.map((r) => r.refId);
          relevanceScore = results[0]?.similarity ?? 0;
          recommendedContentTitles = await this.resolveContentTitles(
            results.map((r) => r.refId),
          );
        } catch (err) {
          this.logger.warn(
            { conceptName, err: String(err) },
            'Recommendation lookup failed',
          );
        }

        return {
          conceptName,
          isMastered: false,
          recommendedContentItems,
          recommendedContentTitles,
          relevanceScore,
        };
      }),
    );
  }

  private async resolveContentTitles(segmentIds: string[]): Promise<string[]> {
    if (segmentIds.length === 0) return [];
    try {
      type TitleRow = { title: string };
      const rows = (await db.execute(sql`
        SELECT DISTINCT ci.title
        FROM transcript_segments ts
        JOIN content_items ci ON ci.id::text = ts.transcript_id::text
        WHERE ts.id = ANY(${segmentIds}::uuid[])
        LIMIT ${segmentIds.length}
      `)) as unknown as TitleRow[];
      return (rows as TitleRow[]).map((r) => r.title).filter(Boolean);
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'resolveContentTitles failed');
      return [];
    }
  }
}
