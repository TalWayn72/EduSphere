import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';

export interface ExtractedConcept {
  name: string;
  definition: string;
  relatedTerms: string[];
}

const ExtractedConceptSchema = z.object({
  concepts: z.array(
    z.object({
      name: z.string().min(1),
      definition: z.string().min(1),
      relatedTerms: z.array(z.string()).default([]),
    })
  ),
});

const SYSTEM_PROMPT =
  'Extract key academic concepts, terms, and their relationships from this text. ' +
  'Return a JSON object with a "concepts" array where each item has: ' +
  'name (string), definition (string), relatedTerms (string[] of related concept names), ' +
  'sourceType (always "COURSE_TRANSCRIPT"). Focus on substantive academic concepts only.';

/**
 * Uses Vercel AI SDK to extract academic concepts from transcript text.
 * Falls back to Ollama when OPENAI_API_KEY is not set (dev mode).
 */
@Injectable()
export class ConceptExtractor {
  private readonly logger = new Logger(ConceptExtractor.name);

  async extract(
    text: string,
    courseId: string,
    tenantId: string
  ): Promise<ExtractedConcept[]> {
    if (!text || text.trim().length < 50) {
      this.logger.debug(
        { courseId, tenantId },
        'Transcript too short for concept extraction — skipping'
      );
      return [];
    }

    try {
      const model = this.buildModel();
      const truncatedText = text.slice(0, 8000); // Stay within token budget

      const { object } = await generateObject({
        model,
        schema: ExtractedConceptSchema,
        system: SYSTEM_PROMPT,
        prompt: `Course ID: ${courseId}\n\nTranscript:\n${truncatedText}`,
      });

      const concepts: ExtractedConcept[] = object.concepts.map((c) => ({
        name: c.name.trim(),
        definition: c.definition.trim(),
        relatedTerms: c.relatedTerms.map((t) => t.trim()).filter(Boolean),
      }));

      this.logger.log(
        { courseId, tenantId, count: concepts.length },
        'Extracted concepts from transcript'
      );

      return concepts;
    } catch (err) {
      this.logger.error(
        { err, courseId, tenantId },
        'Concept extraction failed — continuing without graph update'
      );
      return [];
    }
  }

  private buildModel() {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      return openai('gpt-4o-mini');
    }

    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const ollama = createOllama({ baseURL: `${ollamaUrl}/api` });
    return ollama('llama3.2');
  }
}
