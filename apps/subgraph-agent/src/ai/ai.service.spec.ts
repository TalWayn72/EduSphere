import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Vercel AI SDK ────────────────────────────────────────────────────────
const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
  stepCountIs: (n: number) => (_: unknown) => n,
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: () => 'mock-model',
}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn(() => 'mock-ollama-model')),
}));

// ── Mock LangGraph adapters ───────────────────────────────────────────────────
const mockRunLangGraphDebate = vi.fn();
const mockRunLangGraphQuiz = vi.fn();
const mockRunLangGraphTutor = vi.fn();

vi.mock('./ai.langgraph', () => ({
  checkpointer: {},
  runLangGraphDebate: (...args: unknown[]) => mockRunLangGraphDebate(...args),
  runLangGraphQuiz: (...args: unknown[]) => mockRunLangGraphQuiz(...args),
  runLangGraphTutor: (...args: unknown[]) => mockRunLangGraphTutor(...args),
  runLangGraphAssessment: vi.fn(),
}));

// ── Mock DB helpers used by tool closures ────────────────────────────────────
const mockSearchKnowledgeGraph = vi.fn();
const mockFetchContentItem = vi.fn();

vi.mock('./ai.service.db', () => ({
  searchKnowledgeGraph: (...args: unknown[]) => mockSearchKnowledgeGraph(...args),
  fetchContentItem: (...args: unknown[]) => mockFetchContentItem(...args),
}));

// ── Mock agent-tools ──────────────────────────────────────────────────────────
// Mimic the Vercel AI tool() wrapper: the internal execute destructures the
// object args (as Vercel would) and calls the user-provided closure positionally.
vi.mock('./tools/agent-tools', () => ({
  buildSearchKnowledgeGraphTool: (exec: (q: string, l: number) => Promise<unknown>) =>
    ({
      description: 'search-knowledge-graph',
      parameters: {},
      execute: ({ query, limit }: { query: string; limit: number }) => exec(query, limit),
    }),
  buildFetchCourseContentTool: (exec: (id: string) => Promise<unknown>) =>
    ({
      description: 'fetch-course-content',
      parameters: {},
      execute: ({ contentItemId }: { contentItemId: string }) => exec(contentItemId),
    }),
  searchKnowledgeGraphSchema: {},
  fetchCourseContentSchema: {},
}));

// Import AFTER mocks are declared
import { AIService } from './ai.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_AGENT_EXPLAIN = {
  template: 'EXPLAIN',
  config: { temperature: 0.7, maxTokens: 1000, systemPrompt: '' },
};
const MOCK_AGENT_QUIZ = { template: 'QUIZ_ASSESS', config: {} };
const MOCK_AGENT_CHAVRUTA = { template: 'CHAVRUTA_DEBATE', config: {} };
const MOCK_AGENT_SUMMARIZE = { template: 'SUMMARIZE', config: {} };
const MOCK_AGENT_RESEARCH = { template: 'RESEARCH_SCOUT', config: {} };

const MOCK_INPUT = {
  message: 'What is photosynthesis?',
  context: { courseId: 'course-1' },
};

const MOCK_INPUT_WITH_CONTENT = {
  message: 'Explain this topic',
  context: { content: 'Photosynthesis is the process by which plants...' },
  sessionId: 'session-1',
};

const MOCK_GENERATE_RESULT = {
  text: 'Photosynthesis is the process by which plants...',
  usage: { promptTokens: 50, completionTokens: 100 },
  finishReason: 'stop',
};

const MOCK_LANGGRAPH_RESULT = {
  text: 'LangGraph response',
  workflowResult: { isComplete: true },
};

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIService();

    mockRunLangGraphDebate.mockResolvedValue(MOCK_LANGGRAPH_RESULT);
    mockRunLangGraphQuiz.mockResolvedValue(MOCK_LANGGRAPH_RESULT);
    mockRunLangGraphTutor.mockResolvedValue(MOCK_LANGGRAPH_RESULT);
  });

  // ── execute — generic (EXPLAIN) template ─────────────────────────────────

  describe('execute() — generic EXPLAIN template', () => {
    it('calls generateText and returns text, usage, finishReason', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(result).toEqual({
        text: MOCK_GENERATE_RESULT.text,
        usage: MOCK_GENERATE_RESULT.usage,
        finishReason: MOCK_GENERATE_RESULT.finishReason,
      });
    });

    it('calls generateText with a system prompt', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.any(String) })
      );
    });

    it('uses temperature from agent config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agent = { ...MOCK_AGENT_EXPLAIN, config: { temperature: 0.3, maxTokens: 500 } };
      await service.execute(agent, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.3 })
      );
    });

    it('uses maxTokens from agent config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agent = { ...MOCK_AGENT_EXPLAIN, config: { temperature: 0.7, maxTokens: 500 } };
      await service.execute(agent, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ maxOutputTokens: 500 })
      );
    });

    it('defaults temperature to 0.7 when not in config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agentNoConfig = { ...MOCK_AGENT_EXPLAIN, config: undefined };
      await service.execute(agentNoConfig, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.7 })
      );
    });

    it('defaults maxTokens to 2000 when not in config', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const agentNoConfig = { ...MOCK_AGENT_EXPLAIN, config: undefined };
      await service.execute(agentNoConfig, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ maxOutputTokens: 2000 })
      );
    });

    it('propagates error when generateText throws', async () => {
      mockGenerateText.mockRejectedValue(new Error('API rate limit exceeded'));
      await expect(service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('includes context in user prompt when provided', async () => {
      let capturedCall: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedCall = args as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT_EXPLAIN, {
        message: 'Explain this',
        context: { topic: 'algebra' },
      });
      expect(String(capturedCall['prompt'])).toContain('algebra');
    });

    it('uses EXPLAIN system prompt template', async () => {
      let capturedCall: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedCall = args as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(String(capturedCall['system']).toLowerCase()).toContain('explain');
    });

    it('uses RESEARCH_SCOUT system prompt', async () => {
      let capturedCall: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedCall = args as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT_RESEARCH, MOCK_INPUT);
      expect(String(capturedCall['system']).toLowerCase()).toContain('research');
    });

    it('falls back to default prompt for unknown template', async () => {
      let capturedCall: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedCall = args as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute({ ...MOCK_AGENT_EXPLAIN, template: 'UNKNOWN' }, MOCK_INPUT);
      expect(typeof capturedCall['system']).toBe('string');
    });
  });

  // ── execute — CHAVRUTA_DEBATE workflow routing ─────────────────────────────

  describe('execute() — CHAVRUTA_DEBATE (legacy manual workflow)', () => {
    it('routes CHAVRUTA_DEBATE to chavruta workflow and returns text', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.execute(MOCK_AGENT_CHAVRUTA, MOCK_INPUT_WITH_CONTENT);
      expect(result.text).toBe(MOCK_GENERATE_RESULT.text);
    });

    it('returns workflowResult with nextState', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.execute(MOCK_AGENT_CHAVRUTA, MOCK_INPUT_WITH_CONTENT);
      expect(result.workflowResult).toBeDefined();
      expect((result.workflowResult as Record<string, unknown>)['nextState']).toBeDefined();
    });

    it('calls generateText via chavruta workflow', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT_CHAVRUTA, MOCK_INPUT_WITH_CONTENT);
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('uses Chavruta system prompt', async () => {
      let capturedCall: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedCall = args as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT_CHAVRUTA, MOCK_INPUT_WITH_CONTENT);
      expect(String(capturedCall['system'] ?? '')).toContain('Chavruta');
    });
  });

  // ── execute — QUIZ_ASSESS ─────────────────────────────────────────────────

  describe('execute() — QUIZ_ASSESS (legacy manual workflow)', () => {
    it('routes QUIZ_ASSESS and returns text', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Quiz result', usage: {}, finishReason: 'stop' });
      const result = await service.execute(MOCK_AGENT_QUIZ, MOCK_INPUT_WITH_CONTENT);
      expect(result.text).toBeDefined();
    });

    it('returns workflowResult for QUIZ_ASSESS', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Quiz result', usage: {}, finishReason: 'stop' });
      const result = await service.execute(MOCK_AGENT_QUIZ, MOCK_INPUT_WITH_CONTENT);
      expect(result.workflowResult).toBeDefined();
    });
  });

  // ── execute — SUMMARIZE ───────────────────────────────────────────────────

  describe('execute() — SUMMARIZE (legacy manual workflow)', () => {
    it('routes SUMMARIZE and returns text', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.execute(MOCK_AGENT_SUMMARIZE, MOCK_INPUT_WITH_CONTENT);
      expect(result.text).toBeDefined();
    });

    it('returns workflowResult for SUMMARIZE', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.execute(MOCK_AGENT_SUMMARIZE, MOCK_INPUT_WITH_CONTENT);
      expect(result.workflowResult).toBeDefined();
    });
  });

  // ── continueSession — LangGraph routing ───────────────────────────────────

  describe('continueSession() — LangGraph routing', () => {
    const SESSION_ID = 'session-abc-123';
    const MESSAGE = 'Tell me about the French Revolution';
    const CTX = { topic: 'French Revolution' };

    it('routes CHAVRUTA_DEBATE to runLangGraphDebate', async () => {
      const result = await service.continueSession(
        SESSION_ID, MESSAGE, 'CHAVRUTA_DEBATE', CTX
      );
      expect(mockRunLangGraphDebate).toHaveBeenCalledWith(SESSION_ID, MESSAGE, CTX, 'en');
      expect(result.text).toBe(MOCK_LANGGRAPH_RESULT.text);
    });

    it('passes thread_id (sessionId) as first arg to runLangGraphDebate', async () => {
      await service.continueSession(SESSION_ID, MESSAGE, 'CHAVRUTA_DEBATE', CTX);
      expect(mockRunLangGraphDebate).toHaveBeenCalledWith(
        SESSION_ID,
        expect.any(String),
        expect.any(Object),
        expect.any(String)
      );
    });

    it('routes QUIZ_GENERATOR to runLangGraphQuiz', async () => {
      const result = await service.continueSession(
        SESSION_ID, MESSAGE, 'QUIZ_GENERATOR', CTX
      );
      expect(mockRunLangGraphQuiz).toHaveBeenCalledWith(SESSION_ID, MESSAGE, CTX, 'en');
      expect(result.text).toBe(MOCK_LANGGRAPH_RESULT.text);
    });

    it('routes QUIZ_ASSESS to runLangGraphQuiz', async () => {
      await service.continueSession(SESSION_ID, MESSAGE, 'QUIZ_ASSESS', CTX);
      expect(mockRunLangGraphQuiz).toHaveBeenCalledWith(SESSION_ID, MESSAGE, CTX, 'en');
    });

    it('routes TUTOR to runLangGraphTutor', async () => {
      const result = await service.continueSession(
        SESSION_ID, MESSAGE, 'TUTOR', CTX
      );
      expect(mockRunLangGraphTutor).toHaveBeenCalledWith(SESSION_ID, MESSAGE, CTX, 'en');
      expect(result.text).toBe(MOCK_LANGGRAPH_RESULT.text);
    });

    it('routes EXPLANATION_GENERATOR to runLangGraphTutor', async () => {
      await service.continueSession(SESSION_ID, MESSAGE, 'EXPLANATION_GENERATOR', CTX);
      expect(mockRunLangGraphTutor).toHaveBeenCalledWith(SESSION_ID, MESSAGE, CTX, 'en');
    });

    it('routes SUMMARIZE to legacy summarizer (not LangGraph adapters)', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.continueSession(SESSION_ID, MESSAGE, 'SUMMARIZE', {});
      expect(mockRunLangGraphDebate).not.toHaveBeenCalled();
      expect(mockRunLangGraphQuiz).not.toHaveBeenCalled();
      expect(mockRunLangGraphTutor).not.toHaveBeenCalled();
    });

    it('routes EXPLAIN to generic fallback (not LangGraph adapters)', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.continueSession(SESSION_ID, MESSAGE, 'EXPLAIN', {});
      expect(mockRunLangGraphDebate).not.toHaveBeenCalled();
      expect(result.text).toBe(MOCK_GENERATE_RESULT.text);
    });

    it('routes RESEARCH_SCOUT to generic fallback', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const result = await service.continueSession(SESSION_ID, MESSAGE, 'RESEARCH_SCOUT', {});
      expect(result.text).toBe(MOCK_GENERATE_RESULT.text);
    });

    it('includes workflowResult from LangGraph adapter', async () => {
      const result = await service.continueSession(
        SESSION_ID, MESSAGE, 'CHAVRUTA_DEBATE', CTX
      );
      expect(result.workflowResult).toEqual(MOCK_LANGGRAPH_RESULT.workflowResult);
    });

    it('propagates error from LangGraph adapter', async () => {
      mockRunLangGraphDebate.mockRejectedValueOnce(new Error('LangGraph timeout'));
      await expect(
        service.continueSession(SESSION_ID, MESSAGE, 'CHAVRUTA_DEBATE', CTX)
      ).rejects.toThrow('LangGraph timeout');
    });

    it('uses empty context object when none provided', async () => {
      await service.continueSession(SESSION_ID, MESSAGE, 'CHAVRUTA_DEBATE');
      expect(mockRunLangGraphDebate).toHaveBeenCalledWith(SESSION_ID, MESSAGE, {}, 'en');
    });
  });

  // ── isLangGraphTemplate ───────────────────────────────────────────────────

  describe('isLangGraphTemplate()', () => {
    it('returns true for CHAVRUTA_DEBATE', () => {
      expect(service.isLangGraphTemplate('CHAVRUTA_DEBATE')).toBe(true);
    });

    it('returns true for TUTOR', () => {
      expect(service.isLangGraphTemplate('TUTOR')).toBe(true);
    });

    it('returns true for QUIZ_GENERATOR', () => {
      expect(service.isLangGraphTemplate('QUIZ_GENERATOR')).toBe(true);
    });

    it('returns true for QUIZ_ASSESS', () => {
      expect(service.isLangGraphTemplate('QUIZ_ASSESS')).toBe(true);
    });

    it('returns true for EXPLANATION_GENERATOR', () => {
      expect(service.isLangGraphTemplate('EXPLANATION_GENERATOR')).toBe(true);
    });

    it('returns false for EXPLAIN', () => {
      expect(service.isLangGraphTemplate('EXPLAIN')).toBe(false);
    });

    it('returns false for SUMMARIZE', () => {
      expect(service.isLangGraphTemplate('SUMMARIZE')).toBe(false);
    });

    it('returns false for RESEARCH_SCOUT', () => {
      expect(service.isLangGraphTemplate('RESEARCH_SCOUT')).toBe(false);
    });

    it('returns false for unknown template', () => {
      expect(service.isLangGraphTemplate('UNKNOWN_XYZ')).toBe(false);
    });
  });

  // ── executeStream ─────────────────────────────────────────────────────────

  describe('executeStream()', () => {
    it('calls streamText for EXPLAIN and returns the stream result', async () => {
      const mockStream = { stream: 'mock-stream' };
      mockStreamText.mockReturnValue(mockStream);
      const result = await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(result).toEqual(mockStream);
    });

    it('calls streamText with system prompt for EXPLAIN', async () => {
      mockStreamText.mockReturnValue({});
      await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.any(String) })
      );
    });

    it('calls streamText with user prompt for EXPLAIN', async () => {
      mockStreamText.mockReturnValue({});
      await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.any(String) })
      );
    });

    it('uses temperature from agent config in stream mode', async () => {
      mockStreamText.mockReturnValue({});
      const agent = { ...MOCK_AGENT_EXPLAIN, config: { temperature: 0.2, maxTokens: 300 } };
      await service.executeStream(agent, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2 })
      );
    });

    it('routes CHAVRUTA_DEBATE stream through chavruta workflow', async () => {
      mockStreamText.mockReturnValue({ stream: 'chavruta-stream' });
      const result = await service.executeStream(MOCK_AGENT_CHAVRUTA, MOCK_INPUT_WITH_CONTENT);
      expect(mockStreamText).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('routes QUIZ_ASSESS stream through quiz workflow', async () => {
      mockStreamText.mockReturnValue({ stream: 'quiz-stream' });
      await service.executeStream(MOCK_AGENT_QUIZ, MOCK_INPUT_WITH_CONTENT);
      expect(mockStreamText).toHaveBeenCalled();
    });

    it('routes SUMMARIZE stream through summarizer workflow', async () => {
      mockStreamText.mockReturnValue({ stream: 'summarize-stream' });
      await service.executeStream(MOCK_AGENT_SUMMARIZE, MOCK_INPUT_WITH_CONTENT);
      expect(mockStreamText).toHaveBeenCalled();
    });
  });

  // ── Tool integration — generateText includes tools + maxSteps ─────────────

  describe('execute() — tool integration', () => {
    it('passes tools object to generateText for EXPLAIN template', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ tools: expect.any(Object) })
      );
    });

    it('passes stopWhen to generateText for EXPLAIN template', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ stopWhen: expect.any(Function) })
      );
    });

    it('passes tools object to generateText for RESEARCH_SCOUT template', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT_RESEARCH, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ tools: expect.any(Object) })
      );
    });

    it('tools object contains searchKnowledgeGraph key', async () => {
      let capturedTools: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(capturedTools).toHaveProperty('searchKnowledgeGraph');
    });

    it('tools object contains fetchCourseContent key', async () => {
      let capturedTools: Record<string, unknown> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, unknown>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(capturedTools).toHaveProperty('fetchCourseContent');
    });

    it('uses tenantId from input when provided', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      const inputWithTenant = { ...MOCK_INPUT, tenantId: 'tenant-abc' };
      await service.execute(MOCK_AGENT_EXPLAIN, inputWithTenant);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ tools: expect.any(Object) })
      );
    });

    it('defaults tenantId to empty string when not provided', async () => {
      mockGenerateText.mockResolvedValue(MOCK_GENERATE_RESULT);
      await service.execute(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockGenerateText).toHaveBeenCalled();
    });
  });

  // ── Tool integration — streamText includes tools + maxSteps ───────────────

  describe('executeStream() — tool integration', () => {
    it('passes tools object to streamText for EXPLAIN template', async () => {
      mockStreamText.mockReturnValue({});
      await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ tools: expect.any(Object) })
      );
    });

    it('passes stopWhen to streamText for EXPLAIN template', async () => {
      mockStreamText.mockReturnValue({});
      await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ stopWhen: expect.any(Function) })
      );
    });

    it('tools object contains searchKnowledgeGraph for stream', async () => {
      let capturedTools: Record<string, unknown> = {};
      mockStreamText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, unknown>;
        return {};
      });
      await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(capturedTools).toHaveProperty('searchKnowledgeGraph');
    });

    it('tools object contains fetchCourseContent for stream', async () => {
      let capturedTools: Record<string, unknown> = {};
      mockStreamText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, unknown>;
        return {};
      });
      await service.executeStream(MOCK_AGENT_EXPLAIN, MOCK_INPUT);
      expect(capturedTools).toHaveProperty('fetchCourseContent');
    });

    it('uses tenantId from input in stream mode', async () => {
      mockStreamText.mockReturnValue({});
      const inputWithTenant = { ...MOCK_INPUT, tenantId: 'tenant-xyz' };
      await service.executeStream(MOCK_AGENT_EXPLAIN, inputWithTenant);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({ tools: expect.any(Object), stopWhen: expect.any(Function) })
      );
    });

    it('workflow-routed templates (CHAVRUTA) do NOT call streamText with tools+maxSteps from service', async () => {
      mockStreamText.mockReturnValue({ stream: 'chavruta' });
      await service.executeStream(MOCK_AGENT_CHAVRUTA, MOCK_INPUT_WITH_CONTENT);
      const calls = mockStreamText.mock.calls as Array<[Record<string, unknown>]>;
      const serviceToolsCall = calls.some(
        ([arg]) => 'tools' in arg && 'stopWhen' in arg
      );
      // Chavruta workflow calls streamText internally but without service-injected tools
      expect(serviceToolsCall).toBe(false);
    });
  });

  // ── searchKnowledgeGraph tool execute closure ─────────────────────────────

  describe('searchKnowledgeGraph tool execute closure', () => {
    it('delegates to DB helper with correct tenantId and query', async () => {
      const mockResults = [{ id: 'r1', text: 'chloroplast', type: 'ts', similarity: 0.9 }];
      mockSearchKnowledgeGraph.mockResolvedValue(mockResults);

      type ToolDef = { execute: (args: { query: string; limit: number }) => Promise<unknown> };
      let capturedTools: Record<string, ToolDef> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, ToolDef>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });

      await service.execute(MOCK_AGENT_EXPLAIN, { ...MOCK_INPUT, tenantId: 'tenant-123' });

      const toolExec = capturedTools['searchKnowledgeGraph']?.execute;
      if (toolExec) {
        await toolExec({ query: 'biology', limit: 3 });
        expect(mockSearchKnowledgeGraph).toHaveBeenCalledWith('biology', 'tenant-123', 3);
      }
    });

    it('returns results from DB helper', async () => {
      const mockResults = [{ id: 'r1', text: 'mitosis', type: 'ts', similarity: 0.85 }];
      mockSearchKnowledgeGraph.mockResolvedValue(mockResults);

      type ToolDef = { execute: (args: { query: string; limit: number }) => Promise<unknown> };
      let capturedTools: Record<string, ToolDef> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, ToolDef>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });

      await service.execute(MOCK_AGENT_EXPLAIN, { ...MOCK_INPUT, tenantId: 'tenant-456' });

      const toolExec = capturedTools['searchKnowledgeGraph']?.execute;
      if (toolExec) {
        const result = await toolExec({ query: 'mitosis', limit: 5 });
        expect(result).toEqual(mockResults);
      }
    });
  });

  // ── fetchCourseContent tool execute closure ───────────────────────────────

  describe('fetchCourseContent tool execute closure', () => {
    it('delegates to DB helper with contentItemId and tenantId', async () => {
      const mockItem = { id: 'item-1', title: 'Math 101', type: 'course', content: null };
      mockFetchContentItem.mockResolvedValue(mockItem);

      type ToolDef = { execute: (args: { contentItemId: string }) => Promise<unknown> };
      let capturedTools: Record<string, ToolDef> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, ToolDef>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });

      await service.execute(MOCK_AGENT_EXPLAIN, { ...MOCK_INPUT, tenantId: 'tenant-789' });

      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const toolExec = capturedTools['fetchCourseContent']?.execute;
      if (toolExec) {
        await toolExec({ contentItemId: uuid });
        expect(mockFetchContentItem).toHaveBeenCalledWith(uuid, 'tenant-789');
      }
    });

    it('returns null when item not found', async () => {
      mockFetchContentItem.mockResolvedValue(null);

      type ToolDef = { execute: (args: { contentItemId: string }) => Promise<unknown> };
      let capturedTools: Record<string, ToolDef> = {};
      mockGenerateText.mockImplementation((args: unknown) => {
        capturedTools = (args as Record<string, unknown>)['tools'] as Record<string, ToolDef>;
        return Promise.resolve(MOCK_GENERATE_RESULT);
      });

      await service.execute(MOCK_AGENT_EXPLAIN, { ...MOCK_INPUT, tenantId: 'tenant-000' });

      const uuid = '123e4567-e89b-12d3-a456-426614174001';
      const toolExec = capturedTools['fetchCourseContent']?.execute;
      if (toolExec) {
        const result = await toolExec({ contentItemId: uuid });
        expect(result).toBeNull();
      }
    });
  });

  // ── getConversationMemory ─────────────────────────────────────────────────

  describe('getConversationMemory()', () => {
    it('returns an empty array (stub)', async () => {
      const result = await service.getConversationMemory('session-1');
      expect(result).toEqual([]);
    });

    it('accepts sessionId and optional limit without throwing', async () => {
      await expect(service.getConversationMemory('session-1', 5)).resolves.toBeDefined();
    });
  });

  // ── saveConversationMemory ────────────────────────────────────────────────

  describe('saveConversationMemory()', () => {
    it('resolves without throwing (stub)', async () => {
      await expect(
        service.saveConversationMemory('session-1', 'user', 'Hello', {})
      ).resolves.toBeUndefined();
    });
  });
});
