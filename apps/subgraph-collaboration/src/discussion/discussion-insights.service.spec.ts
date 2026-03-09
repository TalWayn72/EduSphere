import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { DiscussionInsightsService } from './discussion-insights.service';
import * as ai from 'ai';

vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn().mockReturnValue(() => 'mock-model'),
}));

describe('DiscussionInsightsService', () => {
  let service: DiscussionInsightsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [DiscussionInsightsService],
    }).compile();
    service = module.get(DiscussionInsightsService);
  });

  describe('summarizeThread', () => {
    it('uses system prompt with hardcoded summarizer role (not user-controllable)', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"Summary","keyTopics":["React"],"suggestedFollowUp":"What next?"}',
      } as never);

      await service.summarizeThread(
        [{ content: 'Hello', userId: 'u1' }],
        'React Discussion',
      );

      const call = vi.mocked(ai.generateText).mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      // SEC-6: system prompt must be hardcoded
      expect(call.messages[0].role).toBe('system');
      expect(call.messages[0].content).toContain('summarizer');
      // SEC-6: user content must be JSON.stringify (not raw string concat)
      expect(call.messages[1].content).toContain('"task"');
      expect(call.messages[1].content).toContain('"data"');
    });

    it('returns summary, keyTopics, suggestedFollowUp, generatedAt', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"Test summary","keyTopics":["React","Hooks"],"suggestedFollowUp":"What about useEffect?"}',
      } as never);

      const result = await service.summarizeThread(
        [{ content: 'msg', userId: 'u1' }],
        'Test',
      );

      expect(result.summary).toBe('Test summary');
      expect(result.keyTopics).toContain('React');
      expect(result.keyTopics).toContain('Hooks');
      expect(result.suggestedFollowUp).toBe('What about useEffect?');
      expect(result.generatedAt).toBeTruthy();
    });

    it('handles LLM returning non-JSON gracefully', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: 'Just plain text',
      } as never);

      const result = await service.summarizeThread(
        [{ content: 'msg', userId: 'u1' }],
        'Test',
      );

      expect(result.summary).toBe('Just plain text');
      expect(result.keyTopics).toEqual([]);
      expect(result.suggestedFollowUp).toBeNull();
    });

    it('limits to 50 messages (not unbounded)', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"ok","keyTopics":[],"suggestedFollowUp":null}',
      } as never);

      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        content: `msg ${i}`,
        userId: 'u1',
      }));

      await service.summarizeThread(manyMessages, 'Test');

      const call = vi.mocked(ai.generateText).mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      const data = JSON.parse(call.messages[1].content) as {
        data: unknown[];
      };
      expect(data.data.length).toBeLessThanOrEqual(50);
    });

    it('does not include userId in LLM payload (privacy)', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"ok","keyTopics":[],"suggestedFollowUp":null}',
      } as never);

      await service.summarizeThread(
        [{ content: 'msg', userId: 'secret-user-id' }],
        'Test',
      );

      const call = vi.mocked(ai.generateText).mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      expect(call.messages[1].content).not.toContain('secret-user-id');
    });

    it('sets generatedAt to a valid ISO date string', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"ok","keyTopics":["topic"],"suggestedFollowUp":null}',
      } as never);

      const result = await service.summarizeThread(
        [{ content: 'msg', userId: 'u1' }],
        'Test',
      );

      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
    });

    it('uses discussionTitle in JSON payload', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"ok","keyTopics":[],"suggestedFollowUp":null}',
      } as never);

      await service.summarizeThread(
        [{ content: 'msg', userId: 'u1' }],
        'My Special Discussion Title',
      );

      const call = vi.mocked(ai.generateText).mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      expect(call.messages[1].content).toContain('My Special Discussion Title');
    });

    it('respects maxTokens: 300 limit', async () => {
      vi.mocked(ai.generateText).mockResolvedValue({
        text: '{"summary":"ok","keyTopics":[],"suggestedFollowUp":null}',
      } as never);

      await service.summarizeThread(
        [{ content: 'msg', userId: 'u1' }],
        'Test',
      );

      const call = vi.mocked(ai.generateText).mock.calls[0][0] as {
        maxTokens: number;
      };
      expect(call.maxTokens).toBe(300);
    });
  });
});
