/**
 * HebrewCitationNerService — LLM-enhanced NER for Hebrew sacred text references.
 *
 * Uses Vercel AI SDK v6 with structured output (Zod schema) to detect
 * citations like "עץ חיים שער ממז\"א", "זוהר חלק א דף לב", etc.
 *
 * Follows the pattern established in concept-extractor.ts.
 */
import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { ollamaConfig } from '@edusphere/config';
import {
  CitationNerOutputSchema,
  type CitationCandidate,
} from './citation-ner.schemas';

const SYSTEM_PROMPT = `You are a specialized NER system for Hebrew sacred and religious texts.
Your task is to identify citations and references to sacred texts in Hebrew transcript text.

Recognize these patterns:
- Book + gate/section: "עץ חיים שער ממז\"א" (Etz Chaim, Gate of MaZ"A)
- Book + parasha: "רחובות הנהר פרשת בראשית" (Rechovot HaNahar, Parashat Bereshit)
- Book + volume + page: "זוהר חלק א דף לב" (Zohar Volume 1, Page 32)
- Standard notation: book + part + page + column + paragraph
- Talmud references: "גמרא ברכות דף ט עמוד ב" (Gemara Berakhot 9b)
- Mishnah/Midrash: "משנה אבות פרק ב משנה א"
- Halakhic works: "שולחן ערוך אורח חיים סימן א"
- Kabbalistic works: "ספר הזוהר פרשת וירא", "תיקוני זוהר תיקון יג"
- Hasidic texts: "ליקוטי מוהר\"ן תורה סה"

For each citation found, extract:
- bookName: The name of the sacred text
- part: Section/gate/volume identifier (if present)
- page: Page or folio number (if present)
- column: Column indicator (if present)
- paragraph: Paragraph or mishna number (if present)
- originalText: The exact Hebrew text containing the citation
- confidence: How confident you are (0.0-1.0)

Return ONLY actual sacred text references, not general Hebrew text.`;

/**
 * Segment input for NER processing.
 */
export interface NerSegmentInput {
  readonly id: string;
  readonly text: string;
  readonly startTime: number;
  readonly endTime: number;
}

@Injectable()
export class HebrewCitationNerService {
  private readonly logger = new Logger(HebrewCitationNerService.name);

  /**
   * Runs NER on an array of transcript segments to extract
   * Hebrew sacred text citation candidates.
   */
  async extractCitations(
    segments: NerSegmentInput[],
    lessonId: string,
    tenantId: string
  ): Promise<CitationCandidate[]> {
    if (segments.length === 0) {
      return [];
    }

    const combinedText = this.buildPromptText(segments);
    if (combinedText.length < 20) {
      this.logger.debug(
        { lessonId, tenantId },
        'Text too short for citation NER — skipping'
      );
      return [];
    }

    try {
      const model = this.buildModel();
      const truncatedText = combinedText.slice(0, 12_000);

      const { object } = await generateObject({
        model: model as unknown as Parameters<
          typeof generateObject
        >[0]['model'],
        schema: CitationNerOutputSchema,
        system: SYSTEM_PROMPT,
        prompt: `Lesson ID: ${lessonId}\n\nTranscript:\n${truncatedText}`,
      });

      const citations = this.enrichWithSegmentInfo(object.citations, segments);

      this.logger.log(
        { lessonId, tenantId, count: citations.length },
        'Extracted citation candidates from transcript'
      );

      return citations;
    } catch (err) {
      this.logger.error(
        { err, lessonId, tenantId },
        'Citation NER failed — continuing without citations'
      );
      return [];
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private buildPromptText(segments: NerSegmentInput[]): string {
    return segments
      .map(
        (s) => `[${s.startTime.toFixed(1)}s-${s.endTime.toFixed(1)}s] ${s.text}`
      )
      .join('\n');
  }

  /**
   * Matches LLM-extracted citations back to their source segments
   * by finding overlapping text.
   */
  private enrichWithSegmentInfo(
    citations: CitationCandidate[],
    segments: NerSegmentInput[]
  ): CitationCandidate[] {
    return citations.map((citation) => {
      const matchingSegment = segments.find(
        (s) =>
          s.text.includes(citation.originalText) ||
          citation.originalText.includes(s.text.substring(0, 20))
      );

      if (matchingSegment) {
        return {
          ...citation,
          segmentId: matchingSegment.id,
          startTime: matchingSegment.startTime,
          endTime: matchingSegment.endTime,
        };
      }

      return citation;
    });
  }

  private buildModel() {
    const openaiKey = process.env['OPENAI_API_KEY'];
    if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      return openai('gpt-4o-mini');
    }

    const ollamaUrl = ollamaConfig.url;
    const ollama = createOllama({ baseURL: `${ollamaUrl}/api` });
    return ollama('llama3.2');
  }
}
