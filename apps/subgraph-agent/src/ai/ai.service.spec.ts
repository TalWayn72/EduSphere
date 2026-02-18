import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Vercel AI SDK (vi.mock is hoisted; use inline fns only) ──────────────
const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: () => 'mock-model',
}));

// Import AFTER mocks are declared
import { AIService } from './ai.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_AGENT = {
  id: 'agent-1',
  template: 'QUIZ_ASSESS',
  config: { temperature: 0.7, maxTokens: 1000, systemPrompt: '' },
};

const MOCK_INPUT = {
  message: 'What is photosynthesis?',
  context: { courseId: 'course-1' },
};

const MOCK_GENERATE_RESULT = {
  text: 'Photosynthesis is the process by which plants...',
  usage: { promptTokens: 50, completionTokens: 100 },
  finishReason: 'stop',
};

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIService();
  });

  // ── execute ───────────────────────────────────────────────────────────────

  describe('execute()', () => {
    it('calls generateText and returns text, usage, finishReason', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.execute(MOCK_AGENT, MOCK_INPUT);
      expect(result).toEqual({
        text: MOCK_GENERATE_RESULT.text,
        usage: MOCK_GENERATE_RESULT.usage,
        finishReason: MOCK_GENERATE_RESULT.finishReason,
      });
    });

    it('calls generateText with a system prompt', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.any(String) })
      );
    });

    it('calls generateText with a user prompt', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.any(String) })
      );
    });

    it('uses temperature from agent config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agent = { ...MOCK_AGENT, config: { temperature: 0.3, maxTokens: 500 } };
      await service.execute(agent, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.3 })
      );
    });

    it('uses maxTokens from agent config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agent = { ...MOCK_AGENT, config: { temperature: 0.7, maxTokens: 500 } };
      await service.execute(agent, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 500 })
      );
    });

    it('defaults temperature to 0.7 when not in config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agentNoConfig = { ...MOCK_AGENT, config: undefined };
      await service.execute(agentNoConfig, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.7 })
      );
    });

    it('defaults maxTokens to 2000 when not in config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agentNoConfig = { ...MOCK_AGENT, config: undefined };
      await service.execute(agentNoConfig, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 2000 })
      );
    });

    it('propagates error when generateText throws', async () => {
      mockGenerateText.mockRejectedValue(new Error('API rate limit exceeded'));
      await expect(service.execute(MOCK_AGENT, MOCK_INPUT)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('includes context in user prompt when provided', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      const inputWithContext = { message: 'Explain this', context: { topic: 'algebra' } };
      await service.execute(MOCK_AGENT, inputWithContext);
      expect(capturedCall.prompt).toContain('algebra');
    });

    it('uses QUIZ_ASSESS system prompt template', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT, MOCK_INPUT);
      // QUIZ_ASSESS template contains "quiz" (case insensitive)
      expect(capturedCall.system.toLowerCase()).toContain('quiz');
    });

    it('uses CHAVRUTA_DEBATE system prompt template', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      const debateAgent = { ...MOCK_AGENT, template: 'CHAVRUTA_DEBATE' };
      await service.execute(debateAgent, MOCK_INPUT);
      expect(capturedCall.system).toContain('Chavruta');
    });

    it('uses EXPLAIN system prompt template', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      const explainAgent = { ...MOCK_AGENT, template: 'EXPLAIN' };
      await service.execute(explainAgent, MOCK_INPUT);
      expect(capturedCall.system.toLowerCase()).toContain('explain');
    });

    it('uses SUMMARIZE system prompt template', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      const summarizeAgent = { ...MOCK_AGENT, template: 'SUMMARIZE' };
      await service.execute(summarizeAgent, MOCK_INPUT);
      expect(capturedCall.system.toLowerCase()).toContain('summar');
    });

    it('uses RESEARCH_SCOUT system prompt template', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      const researchAgent = { ...MOCK_AGENT, template: 'RESEARCH_SCOUT' };
      await service.execute(researchAgent, MOCK_INPUT);
      expect(capturedCall.system.toLowerCase()).toContain('research');
    });

    it('falls back to default system prompt for unknown template', async () => {
      let capturedCall: any;
      mockGenerateText.mockImplementation((args: any) => {
        capturedCall = args;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      const unknownAgent = { ...MOCK_AGENT, template: 'UNKNOWN_TYPE', config: {} };
      await service.execute(unknownAgent, MOCK_INPUT);
      expect(typeof capturedCall.system).toBe('string');
      expect(capturedCall.system.length).toBeGreaterThan(0);
    });
  });

  // ── executeStream ─────────────────────────────────────────────────────────

  describe('executeStream()', () => {
    it('calls streamText and returns the stream result', async () => {
      const mockStream = { stream: 'mock-stream' };
      mockStreamText.mockReturnValue(mockStream);
      const result = await service.executeStream(MOCK_AGENT, MOCK_INPUT);
      expect(result).toEqual(mockStream);
    });

    it('calls streamText with system prompt', async () => {
      mockStreamText.mockReturnValue({});
      await service.executeStream(MOCK_AGENT, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.any(String) })
      );
    });

    it('calls streamText with user prompt', async () => {
      mockStreamText.mockReturnValue({});
      await service.executeStream(MOCK_AGENT, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.any(String) })
      );
    });

    it('uses temperature from agent config in stream mode', async () => {
      mockStreamText.mockReturnValue({});
      const agent = { ...MOCK_AGENT, config: { temperature: 0.2, maxTokens: 300 } };
      await service.executeStream(agent, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2 })
      );
    });
  });

  // ── getConversationMemory ─────────────────────────────────────────────────

  describe('getConversationMemory()', () => {
    it('returns an empty array (stub implementation)', async () => {
      const result = await service.getConversationMemory('session-1');
      expect(result).toEqual([]);
    });

    it('accepts sessionId and optional limit without throwing', async () => {
      await expect(service.getConversationMemory('session-1', 5)).resolves.toBeDefined();
    });
  });

  // ── saveConversationMemory ────────────────────────────────────────────────

  describe('saveConversationMemory()', () => {
    it('resolves without throwing (stub implementation)', async () => {
      await expect(
        service.saveConversationMemory('session-1', 'user', 'Hello', {})
      ).resolves.toBeUndefined();
    });
  });
});
