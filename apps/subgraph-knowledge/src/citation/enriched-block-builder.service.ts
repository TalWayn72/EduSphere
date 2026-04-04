/**
 * EnrichedBlockBuilderService — assembles enriched transcript blocks
 * from resolved citations and transcript segments.
 *
 * Creates TEXT blocks for regular transcript content and CITATION blocks
 * for segments that contain verified or unverified citations.
 * Pipeline is idempotent — re-running deletes existing blocks first.
 */
import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db, withTenantContext } from '@edusphere/db';

// NOTE: enriched_transcript_blocks table expected from migration 0044
// Import will be available after the DB schema task (P1-04) is complete.
// For now we use raw SQL insert as a forward-compatible approach.

interface ResolvedCitation {
  readonly candidate: {
    readonly bookName: string;
    readonly originalText: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly segmentId?: string;
  };
  readonly matchStatus: 'VERIFIED' | 'UNVERIFIED';
  readonly resolvedText?: string;
  readonly knowledgeSourceId?: string;
  readonly graphSourceId?: string;
}

@Injectable()
export class EnrichedBlockBuilderService {
  private readonly logger = new Logger(EnrichedBlockBuilderService.name);

  /**
   * Builds enriched transcript blocks for a lesson.
   * Idempotent: deletes existing blocks before creating new ones.
   *
   * @returns The number of blocks created
   */
  async buildBlocks(
    lessonId: string,
    tenantId: string,
    resolvedCitations: ResolvedCitation[]
  ): Promise<number> {
    return withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
      async () => {
        // Delete existing blocks for idempotency
        await this.deleteExistingBlocks(lessonId, tenantId);

        // Fetch all transcript segments for this lesson's transcript
        const segments = await this.fetchLessonSegments(
          lessonId,
          tenantId
        );

        if (segments.length === 0) {
          this.logger.warn(
            { lessonId },
            'No transcript segments found — cannot build blocks'
          );
          return 0;
        }

        // Build citation lookup by segmentId for O(1) access
        const citationMap = this.buildCitationMap(resolvedCitations);

        // Create blocks in order
        let blockOrder = 0;
        const blockValues: Array<Record<string, unknown>> = [];

        for (const segment of segments) {
          const citation = citationMap.get(segment.id);

          if (citation) {
            // CITATION block
            blockValues.push({
              tenant_id: tenantId,
              lesson_id: lessonId,
              segment_id: segment.id,
              block_type: 'CITATION',
              block_order: blockOrder++,
              content: JSON.stringify({
                text: segment.text,
                bookName: citation.candidate.bookName,
                resolvedText: citation.resolvedText,
                matchStatus: citation.matchStatus,
              }),
              start_time: segment.start_time,
              end_time: segment.end_time,
            });
          } else {
            // TEXT block
            blockValues.push({
              tenant_id: tenantId,
              lesson_id: lessonId,
              segment_id: segment.id,
              block_type: 'TEXT',
              block_order: blockOrder++,
              content: JSON.stringify({ text: segment.text }),
              start_time: segment.start_time,
              end_time: segment.end_time,
            });
          }
        }

        // Batch insert blocks
        if (blockValues.length > 0) {
          await this.insertBlocks(blockValues);
        }

        this.logger.log(
          {
            lessonId,
            tenantId,
            blockCount: blockValues.length,
            citationBlocks: resolvedCitations.length,
          },
          'Enriched transcript blocks created'
        );

        return blockValues.length;
      }
    );
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async deleteExistingBlocks(
    lessonId: string,
    tenantId: string
  ): Promise<void> {
    await db.execute(
      `DELETE FROM enriched_transcript_blocks
       WHERE lesson_id = '${lessonId}'
       AND tenant_id = '${tenantId}'`
    );
  }

  private async fetchLessonSegments(
    lessonId: string,
    _tenantId: string
  ): Promise<
    Array<{
      id: string;
      text: string;
      start_time: string | null;
      end_time: string | null;
    }>
  > {
    // Join through transcripts → transcript_segments
    const result = await db.execute(
      `SELECT ts.id, ts.text, ts.start_time, ts.end_time
       FROM transcript_segments ts
       JOIN transcripts t ON t.id = ts.transcript_id
       JOIN media_assets ma ON ma.id = t.media_asset_id
       JOIN lesson_assets la ON la.media_asset_id = ma.id
       WHERE la.lesson_id = '${lessonId}'
       ORDER BY ts.segment_index`
    );
    return result.rows as Array<{
      id: string;
      text: string;
      start_time: string | null;
      end_time: string | null;
    }>;
  }

  private buildCitationMap(
    resolved: ResolvedCitation[]
  ): Map<string, ResolvedCitation> {
    const map = new Map<string, ResolvedCitation>();
    for (const r of resolved) {
      if (r.candidate.segmentId) {
        map.set(r.candidate.segmentId, r);
      }
    }
    return map;
  }

  private async insertBlocks(
    blocks: Array<Record<string, unknown>>
  ): Promise<void> {
    for (const block of blocks) {
      await db.execute(
        `INSERT INTO enriched_transcript_blocks
         (tenant_id, lesson_id, segment_id, block_type, block_order,
          content, start_time, end_time)
         VALUES (
           '${block['tenant_id']}',
           '${block['lesson_id']}',
           ${block['segment_id'] ? `'${block['segment_id']}'` : 'NULL'},
           '${block['block_type']}',
           ${block['block_order']},
           '${(block['content'] as string).replace(/'/g, "''")}',
           ${block['start_time'] ?? 'NULL'},
           ${block['end_time'] ?? 'NULL'}
         )`
      );
    }
  }
}
