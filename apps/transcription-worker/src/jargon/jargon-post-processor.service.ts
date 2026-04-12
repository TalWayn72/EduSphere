/**
 * JargonPostProcessorService
 *
 * Orchestrates the full jargon pipeline after transcription:
 * 1. Detect domains via knowledge subgraph GraphQL API
 * 2. Run string-match jargon detection on segments
 * 3. Persist occurrences and emit NATS events
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, schema, withTenantContext, eq } from '@edusphere/db';
import { NatsService } from '../nats/nats.service';
import {
  detectLessonDomains,
  loadTermsForDomain,
  type TermPayload,
} from './jargon-knowledge-client';

export interface JargonPostProcessResult {
  domainCount: number;
  occurrenceCount: number;
  correctedSegmentCount: number;
}

interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
}

@Injectable()
export class JargonPostProcessorService {
  private readonly logger = new Logger(JargonPostProcessorService.name);

  constructor(private readonly nats: NatsService) {}

  async process(
    lessonId: string,
    transcriptId: string,
    tenantId: string
  ): Promise<JargonPostProcessResult> {
    const segments = await this.loadSegments(transcriptId, tenantId);
    if (segments.length === 0) {
      this.logger.debug({ lessonId }, 'No segments — skipping jargon');
      return { domainCount: 0, occurrenceCount: 0, correctedSegmentCount: 0 };
    }

    // Step 1: Detect domains
    const { domains, suggestedTerms } = await detectLessonDomains(
      lessonId,
      tenantId
    );
    const domainCount = domains.length;

    if (domainCount > 0) {
      await this.nats.publish('EDUSPHERE.jargon.domains.detected', {
        lessonId,
        tenantId,
        transcriptId,
        domains: domains.map((d) => ({
          id: d.domain.id,
          name: d.domain.name,
          confidence: d.confidence,
        })),
        timestamp: new Date().toISOString(),
      });
      this.logger.log({ lessonId, domainCount }, 'Domains detected');
    }

    // Step 2: Load terms for detected domains
    const allTerms: TermPayload[] = [];
    for (const { domain } of domains) {
      const terms = await loadTermsForDomain(domain.id, tenantId, 50);
      allTerms.push(...terms);
    }

    // Step 3: Match jargon in segments
    const { occurrences, correctedCount } = this.matchJargon(
      segments,
      allTerms,
      lessonId
    );

    // Step 4: Persist
    if (occurrences.length > 0) {
      await withTenantContext(
        db,
        { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
        async (txDb) => {
          await txDb
            .insert(schema.jargon_occurrences)
            .values(occurrences)
            .onConflictDoNothing();
        }
      );
    }

    // Step 5: Emit completion event
    await this.nats.publish('EDUSPHERE.jargon.detection.completed', {
      lessonId,
      tenantId,
      transcriptId,
      domainCount,
      occurrenceCount: occurrences.length,
      correctedSegmentCount: correctedCount,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Emit auto-discovered terms
    for (const term of suggestedTerms.slice(0, 10)) {
      await this.nats.publish('EDUSPHERE.jargon.term.added', {
        tenantId,
        lessonId,
        termId: term.id,
        canonicalForm: term.canonicalForm,
        domainId: term.domainId,
        source: 'AUTO',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      domainCount,
      occurrenceCount: occurrences.length,
      correctedSegmentCount: correctedCount,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async loadSegments(
    transcriptId: string,
    tenantId: string
  ): Promise<TranscriptSegment[]> {
    try {
      const rows = await withTenantContext(
        db,
        { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
        async (txDb) =>
          txDb
            .select()
            .from(schema.transcript_segments)
            .where(
              eq(schema.transcript_segments.transcript_id, transcriptId)
            )
            .orderBy(schema.transcript_segments.start_time)
      );
      return rows.map((s) => ({
        id: s.id,
        text: s.text,
        start: Number(s.start_time),
        end: Number(s.end_time),
      }));
    } catch (err) {
      this.logger.error({ err, transcriptId }, 'Failed to load segments');
      return [];
    }
  }

  private matchJargon(
    segments: TranscriptSegment[],
    terms: TermPayload[],
    lessonId: string
  ): {
    occurrences: typeof schema.jargon_occurrences.$inferInsert[];
    correctedCount: number;
  } {
    const occurrences: typeof schema.jargon_occurrences.$inferInsert[] = [];
    let correctedCount = 0;

    for (const segment of segments) {
      const lower = segment.text.toLowerCase();
      for (const term of terms) {
        const forms = [term.canonicalForm, ...term.altForms];
        for (const form of forms) {
          if (form.length < 2) continue;
          if (lower.includes(form.toLowerCase())) {
            const isCorrected = form !== term.canonicalForm;
            occurrences.push({
              lesson_id: lessonId,
              term_id: term.id,
              segment_id: segment.id,
              start_time: String(segment.start),
              end_time: String(segment.end),
              original_text: form,
              corrected_text: isCorrected ? term.canonicalForm : null,
              confidence: String(isCorrected ? 0.85 : 1.0),
            });
            if (isCorrected) correctedCount++;
            break;
          }
        }
      }
    }
    return { occurrences, correctedCount };
  }
}
