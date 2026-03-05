/**
 * ai-legacy-runner.service.spec.ts
 * Unit tests for AiLegacyRunnerService.
 * Mocks all AI SDK and workflow dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── SDK mocks ─────────────────────────────────────────────────────────────────

const mockGenerateText = vi.fn().mockResolvedValue({
  text: 'generated text',
  usage: { promptTokens: 10, completionTokens: 20 },
  finishReason: 'stop',
});
const mockStreamText = vi.fn().mockReturnValue({ stream: {} });

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
  stepCountIs: vi.fn().mockReturnValue({}),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn().mockReturnValue({ modelId: 'gpt-4-turbo' }),
}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn().mockReturnValue(vi.fn().mockReturnValue({ modelId: 'llama3.2' })),
}));

const mockChavrutaStep = vi.fn().mockResolvedValue({
  text: 'chavruta',
  nextState: 'ASSESS',
  understandingScore: 3,
  isComplete: false,
});
vi.mock('../workflows/chavruta.workflow.js', () => ({
  createChavrutaWorkflow: vi.fn().mockReturnValue({
    step: (...args: unknown[]) => mockChavrutaStep(...args),
    stream: vi.fn().mockReturnValue({ stream: {} }),
  }),
}));

const mockQuizStep = vi.fn().mockResolvedValue({
  text: 'quiz question',
  nextState: 'ASK',
  updatedContext: {},
  isComplete: false,
});
vi.mock('../workflows/quiz.workflow.js', () => ({
  createQuizWorkflow: vi.fn().mockReturnValue({
    step: (...args: unknown[]) => mockQuizStep(...args),
    stream: vi.fn().mockReturnValue({ stream: {} }),
  }),
}));

vi.mock('../workflows/summarizer.workflow.js', () => ({
  createSummarizerWorkflow: vi.fn().mockReturnValue({
    step: vi.fn().mockResolvedValue({ text: 'summary', nextState: 'DONE', summary: 'x', isComplete: true }),
    stream: vi.fn().mockReturnValue({ stream: {} }),
  }),
}));

vi.mock('./tools/agent-tools.js', () => ({
  buildSearchKnowledgeGraphTool: vi.fn().mockReturnValue({}),
  buildFetchCourseContentTool: vi.fn().mockReturnValue({}),
}));

vi.mock('./ai.service.db.js', () => ({
  searchKnowledgeGraph: vi.fn().mockResolvedValue([]),
  fetchContentItem: vi.fn().mockResolvedValue(null),
}));

vi.mock('./locale-prompt.js', () => ({
  injectLocale: vi.fn().mockImplementation((prompt: string) => prompt),
}));

import { AiLegacyRunnerService } from './ai-legacy-runner.service.js';

describe('AiLegacyRunnerService', () => {
  let service: AiLegacyRunnerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiLegacyRunnerService();
  });

  // ── resolveSystemPrompt ───────────────────────────────────────────────────

  it('resolves EXPLAIN system prompt from default map', () => {
    const prompt = service.resolveSystemPrompt({ template: 'EXPLAIN' });
    expect(prompt).toContain('explainer');
  });

  it('falls back to systemPrompt from config for unknown template', () => {
    // Use a template NOT in DEFAULT_SYSTEM_PROMPTS so the config.systemPrompt fallback fires
    const prompt = service.resolveSystemPrompt({
      template: 'MY_SPECIAL_TEMPLATE',
      config: { systemPrompt: 'Custom instruction' },
    });
    expect(prompt).toBe('Custom instruction');
  });

  it('falls back to generic prompt for unknown template', () => {
    const prompt = service.resolveSystemPrompt({ template: 'UNKNOWN_X' });
    expect(prompt).toContain('helpful');
  });

  // ── buildUserPrompt ───────────────────────────────────────────────────────

  it('returns the message as user prompt', () => {
    const prompt = service.buildUserPrompt({ message: 'hello world' });
    expect(prompt).toContain('hello world');
  });

  it('prepends context JSON when context is provided', () => {
    const prompt = service.buildUserPrompt({
      message: 'explain',
      context: { topic: 'algebra' },
    });
    expect(prompt).toContain('algebra');
    expect(prompt).toContain('explain');
  });

  // ── runGeneric ────────────────────────────────────────────────────────────

  it('runGeneric calls generateText and returns text', async () => {
    const model = service.getModel();
    const result = await service.runGeneric(
      model,
      { template: 'EXPLAIN' },
      { message: 'explain quantum', tenantId: 't1' }
    );
    expect(mockGenerateText).toHaveBeenCalled();
    expect(result.text).toBe('generated text');
  });

  // ── runChavruta ───────────────────────────────────────────────────────────

  it('runChavruta delegates to chavruta workflow', async () => {
    const model = service.getModel();
    const result = await service.runChavruta(model, { sessionId: 's1', message: 'hi' });
    expect(result.text).toBe('chavruta');
    expect(result.workflowResult?.nextState).toBe('ASSESS');
  });

  // ── buildChavrutaCtx / buildQuizCtx ──────────────────────────────────────

  it('buildChavrutaCtx sets defaults when workflowState is absent', () => {
    const ctx = service.buildChavrutaCtx({ sessionId: 's1', message: 'msg' });
    expect(ctx.sessionId).toBe('s1');
    expect(ctx.currentState).toBe('ASSESS');
    expect(ctx.history).toEqual([]);
  });

  it('buildQuizCtx sets defaults when workflowState is absent', () => {
    const ctx = service.buildQuizCtx({ sessionId: 'q1', message: 'content' });
    expect(ctx.currentState).toBe('LOAD_CONTENT');
    expect(ctx.questions).toEqual([]);
  });
});
