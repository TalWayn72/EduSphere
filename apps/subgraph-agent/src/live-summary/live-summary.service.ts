import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  type Database,
} from '@edusphere/db';
import { AiLegacyRunnerService } from '../ai/ai-legacy-runner.service.js';
import { generateText } from 'ai';

export interface JargonTermRef {
  termId: string;
  canonicalForm: string;
  occurrenceCount: number;
}

export interface LiveSessionSummaryResult {
  sessionId: string;
  summary: string;
  keyTopics: string[];
  jargonTermsCovered: JargonTermRef[];
  questionsAsked: number;
  peakViewers: number;
  duration: number;
  generatedAt: Date;
}

interface JargonHit {
  termId?: string;
  term_id?: string;
  canonicalForm?: string;
  canonical_form?: string;
}

@Injectable()
export class LiveSummaryService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveSummaryService.name);
  private readonly db: Database = createDatabaseConnection();

  constructor(private readonly legacyRunner: AiLegacyRunnerService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async findSummary(
    sessionId: string,
    tenantId: string
  ): Promise<LiveSessionSummaryResult | null> {
    const [row] = await this.db
      .select()
      .from(schema.live_session_summaries)
      .where(
        and(
          eq(schema.live_session_summaries.session_id, sessionId),
          eq(schema.live_session_summaries.tenant_id, tenantId)
        )
      )
      .limit(1);

    if (!row) return null;
    return this.mapRow(row);
  }

  async generateSummary(
    sessionId: string,
    tenantId: string
  ): Promise<LiveSessionSummaryResult> {
    // Fetch finalized transcript segments
    const segments = await this.db
      .select()
      .from(schema.live_transcript_segments)
      .where(
        and(
          eq(schema.live_transcript_segments.session_id, sessionId),
          eq(schema.live_transcript_segments.is_final, true),
          eq(schema.live_transcript_segments.tenant_id, tenantId)
        )
      );

    if (segments.length === 0) {
      throw new NotFoundException(
        `No finalized transcript segments found for session ${sessionId}`
      );
    }

    // Fetch answered Q&A questions
    const questions = await this.db
      .select()
      .from(schema.live_qa_questions)
      .where(
        and(
          eq(schema.live_qa_questions.session_id, sessionId),
          eq(schema.live_qa_questions.status, 'ANSWERED'),
          eq(schema.live_qa_questions.tenant_id, tenantId)
        )
      );

    // Fetch session config for peak viewers
    const [config] = await this.db
      .select()
      .from(schema.live_session_configs)
      .where(
        and(
          eq(schema.live_session_configs.session_id, sessionId),
          eq(schema.live_session_configs.tenant_id, tenantId)
        )
      )
      .limit(1);

    // Aggregate jargon occurrences from segments
    const jargonMap = new Map<string, JargonTermRef>();
    for (const seg of segments) {
      const hits = (seg.jargon_hits as JargonHit[]) ?? [];
      for (const hit of hits) {
        const termId = hit.termId ?? hit.term_id ?? '';
        const canonicalForm = hit.canonicalForm ?? hit.canonical_form ?? '';
        if (!termId) continue;
        const existing = jargonMap.get(termId);
        if (existing) {
          existing.occurrenceCount += 1;
        } else {
          jargonMap.set(termId, { termId, canonicalForm, occurrenceCount: 1 });
        }
      }
    }

    // Calculate duration from first to last segment
    const startTimes = segments
      .map((s) => s.start_time)
      .filter((t): t is string => t !== null);
    const endTimes = segments
      .map((s) => s.end_time)
      .filter((t): t is string => t !== null);
    const minStart = startTimes.length
      ? Math.min(...startTimes.map(Number))
      : 0;
    const maxEnd = endTimes.length ? Math.max(...endTimes.map(Number)) : 0;
    const duration = Math.round(maxEnd - minStart);

    // Build transcript text for LLM prompt
    const transcriptText = segments
      .sort((a, b) => a.segment_index - b.segment_index)
      .map((s) => s.text)
      .join(' ');

    // Call LLM to generate summary + key topics
    const { summary, keyTopics } = await this.callLlm(transcriptText);

    const peakViewers = config?.max_viewers ?? 0;
    const questionsAsked = questions.length;
    const jargonTermsCovered = Array.from(jargonMap.values());
    const generatedAt = new Date();

    // Upsert summary (insert or update on conflict)
    await this.db
      .insert(schema.live_session_summaries)
      .values({
        session_id: sessionId,
        tenant_id: tenantId,
        summary,
        key_topics: keyTopics,
        jargon_terms: jargonTermsCovered,
        questions_asked: questionsAsked,
        peak_viewers: peakViewers,
        duration,
        generated_at: generatedAt,
      })
      .onConflictDoUpdate({
        target: schema.live_session_summaries.session_id,
        set: {
          summary,
          key_topics: keyTopics,
          jargon_terms: jargonTermsCovered,
          questions_asked: questionsAsked,
          peak_viewers: peakViewers,
          duration,
          generated_at: generatedAt,
        },
      });

    this.logger.log(`Summary generated for session ${sessionId}`);

    return {
      sessionId,
      summary,
      keyTopics,
      jargonTermsCovered,
      questionsAsked,
      peakViewers,
      duration,
      generatedAt,
    };
  }

  private async callLlm(
    transcriptText: string
  ): Promise<{ summary: string; keyTopics: string[] }> {
    const model = this.legacyRunner.getModel();
    const system = `You are an educational content summarizer. When given a lesson transcript, respond with valid JSON only. No prose outside the JSON object.`;
    const prompt = `Summarize this lesson transcript. Return JSON with exactly two keys:
- "summary": a 2-3 sentence overview of what was taught
- "keyTopics": an array of up to 8 topic strings

Transcript:
${transcriptText.slice(0, 8000)}`;

    const result = await generateText({
      model,
      system,
      prompt,
      maxOutputTokens: 1000,
      temperature: 0.3,
    });

    try {
      // Strip markdown code fences if present
      const cleaned = result.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(cleaned) as {
        summary?: string;
        keyTopics?: string[];
      };
      return {
        summary: parsed.summary ?? result.text,
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      };
    } catch {
      this.logger.warn('LLM response was not valid JSON; using raw text');
      return { summary: result.text, keyTopics: [] };
    }
  }

  private mapRow(
    row: typeof schema.live_session_summaries.$inferSelect
  ): LiveSessionSummaryResult {
    return {
      sessionId: row.session_id,
      summary: row.summary,
      keyTopics: (row.key_topics as string[]) ?? [],
      jargonTermsCovered: (row.jargon_terms as JargonTermRef[]) ?? [],
      questionsAsked: row.questions_asked,
      peakViewers: row.peak_viewers,
      duration: row.duration,
      generatedAt: row.generated_at,
    };
  }
}
