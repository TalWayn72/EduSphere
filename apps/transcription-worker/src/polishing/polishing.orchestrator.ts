/**
 * PolishingOrchestratorService
 *
 * Core service that drives the end-to-end transcript polishing pipeline:
 *  1. Load raw transcript segments (lesson_assets → media_assets → transcripts → segments)
 *  2. Load jargon glossary for the lesson's domains
 *  3. Load existing instructor voice profile (if any)
 *  4. Create a polished_transcripts record (status=PROCESSING)
 *  5. Invoke the LangGraph TranscriptPolishingWorkflow (with progress streaming)
 *  6. Persist results via PolishingPersistenceHelper
 *  7. Update / create instructor_voice_profiles
 *  8. Publish NATS completion events
 *
 * DB persistence is split into polishing.persistence.ts to keep file under 300 lines.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, schema, withTenantContext, eq, and, asc, isNull } from '@edusphere/db';
import { NatsService } from '../nats/nats.service';
import {
  detectLessonDomains,
  loadTermsForDomain,
} from '../jargon/jargon-knowledge-client';
import { loadVoiceProfile, saveVoiceProfile } from './voice-profile.helper';
import {
  createPolishedRecord,
  persistResults,
  markFailed,
} from './polishing.persistence';
import { POLISHING_EVENTS } from './polishing.events';
import type {
  VoiceProfile,
  RawSegment,
  JargonEntry,
  PolishingState,
  FormattedBlock,
} from '@edusphere/langgraph-workflows';

// NOTE: createTranscriptPolishingWorkflow is exported from packages/langgraph-workflows
// once transcript-polishing-workflow.ts is built and added to the package index.
import { createTranscriptPolishingWorkflow } from '@edusphere/langgraph-workflows';

const AUTO_PUBLISH_THRESHOLD = 0.95;

type TenantCtx = { tenantId: string; userId: string; userRole: string };
type SegmentRow = { id: string; start_time: string; end_time: string; text: string };

@Injectable()
export class PolishingOrchestratorService {
  private readonly logger = new Logger(PolishingOrchestratorService.name);

  constructor(private readonly nats: NatsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  async startPolishing(lessonId: string, tenantId: string): Promise<void> {
    const tenantCtx: TenantCtx = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    const segments = await this.loadSegments(lessonId, tenantCtx);
    if (segments.length === 0) {
      this.logger.warn({ lessonId }, 'No segments — skipping polishing');
      return;
    }

    const [glossary, instructorId] = await Promise.all([
      this.loadGlossary(lessonId, tenantId),
      this.loadInstructorId(lessonId, tenantCtx),
    ]);

    const existingProfile = instructorId
      ? await loadVoiceProfile(tenantId, instructorId)
      : null;

    const polishedId = await createPolishedRecord(lessonId, tenantId, tenantCtx);

    await this.nats.publish(POLISHING_EVENTS.STARTED, {
      lessonId,
      tenantId,
      polishedTranscriptId: polishedId,
      timestamp: new Date().toISOString(),
    });

    try {
      const initialState: Partial<PolishingState> = {
        lessonId,
        tenantId,
        rawSegments: segments.map(
          (s): RawSegment => ({
            id: s.id,
            text: s.text,
            startTime: Number(s.start_time),
            endTime: Number(s.end_time),
          }),
        ),
        jargonGlossary: glossary,
        existingVoiceProfile: existingProfile
          ? JSON.stringify(existingProfile)
          : undefined,
        progress: 0,
      };

      const workflow = createTranscriptPolishingWorkflow();
      const result = await this.runWithProgress(
        workflow,
        initialState,
        lessonId,
        tenantId,
        polishedId,
      );

      await persistResults(polishedId, lessonId, tenantId, result, tenantCtx);

      if (instructorId && result.voiceProfile) {
        const fresh = JSON.parse(result.voiceProfile) as VoiceProfile;
        await saveVoiceProfile(tenantId, instructorId, fresh, lessonId);
      }

      await this.publishCompletion(lessonId, tenantId, polishedId, result);
      this.logger.log(
        { lessonId, coverage: result.coverageScore },
        'Polishing pipeline complete',
      );
    } catch (err) {
      this.logger.error({ err, lessonId }, 'Polishing workflow failed');
      await markFailed(polishedId, tenantCtx, err);
      await this.nats.publish(POLISHING_EVENTS.FAILED, {
        lessonId,
        tenantId,
        polishedTranscriptId: polishedId,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async loadSegments(
    lessonId: string,
    tenantCtx: TenantCtx,
  ): Promise<SegmentRow[]> {
    try {
      return withTenantContext(db, tenantCtx, async (txDb) =>
        txDb
          .select({
            id: schema.transcript_segments.id,
            start_time: schema.transcript_segments.start_time,
            end_time: schema.transcript_segments.end_time,
            text: schema.transcript_segments.text,
          })
          .from(schema.lesson_assets)
          .innerJoin(
            schema.media_assets,
            eq(schema.lesson_assets.media_asset_id, schema.media_assets.id),
          )
          .innerJoin(
            schema.transcripts,
            eq(schema.transcripts.asset_id, schema.media_assets.id),
          )
          .innerJoin(
            schema.transcript_segments,
            eq(schema.transcript_segments.transcript_id, schema.transcripts.id),
          )
          .where(eq(schema.lesson_assets.lesson_id, lessonId))
          .orderBy(asc(schema.transcript_segments.start_time)),
      );
    } catch (err) {
      this.logger.error({ err, lessonId }, 'Failed to load segments');
      return [];
    }
  }

  private async loadGlossary(
    lessonId: string,
    tenantId: string,
  ): Promise<JargonEntry[]> {
    const { domains } = await detectLessonDomains(lessonId, tenantId);
    const glossary: JargonEntry[] = [];
    for (const { domain } of domains) {
      const terms = await loadTermsForDomain(domain.id, tenantId, 100);
      for (const t of terms) {
        glossary.push({ canonical: t.canonicalForm, altForms: t.altForms });
      }
    }
    return glossary;
  }

  private async loadInstructorId(
    lessonId: string,
    tenantCtx: TenantCtx,
  ): Promise<string | null> {
    try {
      const rows = await withTenantContext(db, tenantCtx, async (txDb) =>
        txDb
          .select({ instructor_id: schema.lessons.instructor_id })
          .from(schema.lessons)
          .where(
            and(
              eq(schema.lessons.id, lessonId),
              isNull(schema.lessons.deleted_at),
            ),
          )
          .limit(1),
      );
      return rows[0]?.instructor_id ?? null;
    } catch {
      return null;
    }
  }

  private async runWithProgress(
    workflow: ReturnType<typeof createTranscriptPolishingWorkflow>,
    initialState: Partial<PolishingState>,
    lessonId: string,
    tenantId: string,
    polishedId: string,
  ): Promise<PolishingState> {
    const stream = await workflow.stream(initialState as PolishingState);
    let finalState = initialState as PolishingState;

    for await (const update of stream) {
      finalState = { ...finalState, ...update };
      const progress = finalState.progress ?? 0;
      if (progress > 0) {
        await this.nats.publish(POLISHING_EVENTS.PROGRESS, {
          lessonId,
          tenantId,
          polishedTranscriptId: polishedId,
          progress,
          timestamp: new Date().toISOString(),
        });
      }
    }
    return finalState;
  }

  private async publishCompletion(
    lessonId: string,
    tenantId: string,
    polishedId: string,
    result: PolishingState,
  ): Promise<void> {
    const coverageScore = result.coverageScore ?? 0;
    const blockCount = result.formattedBlocks?.length ?? 0;
    const changeCount =
      result.formattedBlocks?.reduce(
        (sum, b: FormattedBlock) => sum + (b.changes?.length ?? 0),
        0,
      ) ?? 0;

    await this.nats.publish(POLISHING_EVENTS.COMPLETED, {
      lessonId,
      tenantId,
      polishedTranscriptId: polishedId,
      coverageScore,
      blockCount,
      changeCount,
      timestamp: new Date().toISOString(),
    });

    if (coverageScore >= AUTO_PUBLISH_THRESHOLD) {
      await this.nats.publish(POLISHING_EVENTS.AUTO_PUBLISHED, {
        lessonId,
        tenantId,
        polishedTranscriptId: polishedId,
        coverageScore,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(
        { lessonId, coverageScore },
        'Transcript auto-published (coverage ≥ 95%)',
      );
    }
  }
}
