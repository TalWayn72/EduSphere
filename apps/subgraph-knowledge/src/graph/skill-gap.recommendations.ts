/**
 * SkillGapRecommendations — resolves content recommendations for each gap concept.
 * Extracted from SkillGapService to respect the 150-line guideline.
 *
 * N+1 fix: uses EmbeddingDataLoader.batchLoad() — all concepts are embedded in
 * parallel, then vector-searched in parallel, replacing N sequential DB queries.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, sql } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { EmbeddingDataLoader } from '../embedding/embedding.dataloader';
import type { SkillGapItem } from './skill-gap.service';

const RECS_PER_CONCEPT = 3;

@Injectable()
export class SkillGapRecommendations {
  private readonly logger = new Logger(SkillGapRecommendations.name);

  constructor(private readonly embeddingDataLoader: EmbeddingDataLoader) {}

  async buildGapItems(
    gapConcepts: string[],
    _tenantId: string
  ): Promise<SkillGapItem[]> {
    if (gapConcepts.length === 0) return [];

    // Build minimal TenantContext from tenantId for RLS enforcement (SI-9)
    const tenantCtx: TenantContext = {
      tenantId: _tenantId,
      userId: 'system',
      userRole: 'STUDENT',
    };

    // Single batched call — all concepts embedded + searched in parallel
    const resultMap = await this.embeddingDataLoader.batchLoad(
      gapConcepts,
      tenantCtx,
      RECS_PER_CONCEPT
    );

    return Promise.all(
      gapConcepts.map(async (conceptName) => {
        const results = resultMap.get(conceptName) ?? [];

        let recommendedContentItems: string[] = [];
        let recommendedContentTitles: string[] = [];
        let relevanceScore = 0;

        if (results.length > 0) {
          recommendedContentItems = results.map((r) => r.refId);
          relevanceScore = results[0]?.similarity ?? 0;
          try {
            recommendedContentTitles = await this.resolveContentTitles(
              results.map((r) => r.refId)
            );
          } catch (err) {
            this.logger.warn(
              { conceptName, err: String(err) },
              '[SkillGapRecommendations] resolveContentTitles failed'
            );
          }
        }

        const explanationText = `Recommended because you have ${gapConcepts.length} unmastered skill gaps in this topic area`;

        return {
          conceptName,
          isMastered: false,
          recommendedContentItems,
          recommendedContentTitles,
          relevanceScore,
          explanationText,
        };
      })
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
      this.logger.warn(
        { err: String(err) },
        '[SkillGapRecommendations] resolveContentTitles failed'
      );
      return [];
    }
  }
}
