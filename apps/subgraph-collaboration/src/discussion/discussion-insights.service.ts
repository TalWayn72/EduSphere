import { Injectable, Logger } from '@nestjs/common';
import { generateText, type LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider';

export interface DiscussionSummary {
  summary: string;
  keyTopics: string[];
  suggestedFollowUp: string | null;
  generatedAt: string;
}

@Injectable()
export class DiscussionInsightsService {
  private readonly logger = new Logger(DiscussionInsightsService.name);

  async summarizeThread(
    messages: Array<{ content: string; userId: string }>,
    discussionTitle: string,
  ): Promise<DiscussionSummary> {
    const ollamaProvider = createOllama({ baseURL: (process.env.OLLAMA_URL ?? 'http://localhost:11434') + '/api' });
    const model = ollamaProvider(process.env.OLLAMA_MODEL ?? 'llama3.2') as unknown as LanguageModel;

    // SEC-6: Use structured JSON data field — NOT string concatenation
    // userId is deliberately excluded from LLM payload for privacy
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a learning discussion summarizer. Summarize only the educational content discussed. Output JSON with fields: summary (string), keyTopics (string[]), suggestedFollowUp (string).',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'summarize',
            discussionTitle,
            data: messages.slice(0, 50).map((m) => ({ content: m.content })),
          }),
        },
      ],
      maxOutputTokens: 300,
    });

    // Parse JSON response with fallback
    try {
      const parsed = JSON.parse(text) as {
        summary?: string;
        keyTopics?: string[];
        suggestedFollowUp?: string | null;
      };
      return {
        summary: parsed.summary ?? text,
        keyTopics: parsed.keyTopics ?? [],
        suggestedFollowUp: parsed.suggestedFollowUp ?? null,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      this.logger.warn(
        `DiscussionInsightsService: LLM returned non-JSON for discussion "${discussionTitle}", using raw text as summary`,
      );
      return {
        summary: text,
        keyTopics: [],
        suggestedFollowUp: null,
        generatedAt: new Date().toISOString(),
      };
    }
  }
}
