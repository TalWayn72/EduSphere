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
 * Stateless helper functions are in polishing.pipeline.ts.
 * DB persistence is in polishing.persistence.ts.
 * Two public entry points share `runPolishingPipeline`: startPolishing (auto/jargon)
 * and resumePolishing (manual regenerate — record already created by mutation service).
 */
import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import { loadVoiceProfile, saveVoiceProfile } from './voice-profile.helper';
import {
  createPolishedRecord,
  persistResults,
  markFailed,
} from './polishing.persistence';
import { POLISHING_EVENTS } from './polishing.events';
import {
  buildPolishingModel,
  loadSegments,
  loadGlossary,
  loadInstructorId,
  runWithProgress,
  publishCompletion,
} from './polishing.pipeline';
import type { TenantCtx } from './polishing.pipeline';
import { createTranscriptPolishingWorkflow } from '@edusphere/langgraph-workflows';
import type {
  VoiceProfile,
  RawSegment,
  PolishingState,
} from '@edusphere/langgraph-workflows';

@Injectable()
export class PolishingOrchestratorService {
  private readonly logger = new Logger(PolishingOrchestratorService.name);

  constructor(private readonly nats: NatsService) {}

  // ─── Public entry points ───────────────────────────────────────────────────

  /**
   * resumePolishing — manual trigger path (instructor clicks "Start AI Polishing").
   *
   * The `regeneratePolishedTranscript` mutation already created the DB record and
   * published `EDUSPHERE.polishing.started` with the record id. We must NOT call
   * `createPolishedRecord` again; instead we run the workflow against the
   * existing `polishedTranscriptId`.
   */
  async resumePolishing(
    lessonId: string,
    tenantId: string,
    polishedTranscriptId: string
  ): Promise<void> {
    const tenantCtx: TenantCtx = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    await this.runPolishingPipeline(
      lessonId,
      tenantId,
      tenantCtx,
      polishedTranscriptId
    );
  }

  async startPolishing(lessonId: string, tenantId: string): Promise<void> {
    const tenantCtx: TenantCtx = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    const polishedId = await createPolishedRecord(
      lessonId,
      tenantId,
      tenantCtx
    );
    await this.nats.publish(POLISHING_EVENTS.STARTED, {
      lessonId,
      tenantId,
      polishedTranscriptId: polishedId,
      timestamp: new Date().toISOString(),
    });
    await this.runPolishingPipeline(lessonId, tenantId, tenantCtx, polishedId);
  }

  // ─── Shared pipeline ──────────────────────────────────────────────────────

  /**
   * Core pipeline shared by both entry points.
   * Assumes a `polished_transcripts` record with `polishedId` already exists.
   */
  private async runPolishingPipeline(
    lessonId: string,
    tenantId: string,
    tenantCtx: TenantCtx,
    polishedId: string
  ): Promise<void> {
    const segments = await loadSegments(lessonId, tenantCtx);
    if (segments.length === 0) {
      this.logger.warn({ lessonId }, 'No segments — skipping polishing');
      await markFailed(
        polishedId,
        tenantCtx,
        new Error('No transcript segments found')
      );
      return;
    }

    const [glossary, instructorId] = await Promise.all([
      loadGlossary(lessonId, tenantId),
      loadInstructorId(lessonId, tenantCtx),
    ]);

    const existingProfile = instructorId
      ? await loadVoiceProfile(tenantId, instructorId)
      : null;

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
          })
        ),
        jargonGlossary: glossary,
        existingVoiceProfile: existingProfile
          ? JSON.stringify(existingProfile)
          : undefined,
        progress: 0,
      };

      const workflow = createTranscriptPolishingWorkflow({
        model: buildPolishingModel(),
      });
      const result = await runWithProgress(
        workflow,
        initialState,
        lessonId,
        tenantId,
        polishedId,
        this.nats
      );

      await persistResults(polishedId, lessonId, tenantId, result, tenantCtx);

      if (instructorId && result.voiceProfile) {
        const fresh = JSON.parse(result.voiceProfile) as VoiceProfile;
        await saveVoiceProfile(tenantId, instructorId, fresh, lessonId);
      }

      await publishCompletion(
        lessonId,
        tenantId,
        polishedId,
        result,
        this.nats
      );
      this.logger.log(
        { lessonId, coverage: result.coverageScore },
        'Polishing pipeline complete'
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
}
