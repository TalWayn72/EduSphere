/**
 * ai-langgraph-runner.service.spec.ts
 * Unit tests for AiLanggraphRunnerService.
 * Mocks LangGraphService + all LangGraph workflow adapters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRunLangGraphDebate = vi.fn().mockResolvedValue({ text: 'debate', usage: {} });
const mockRunLangGraphQuiz = vi.fn().mockResolvedValue({ text: 'quiz', usage: {} });
const mockRunLangGraphTutor = vi.fn().mockResolvedValue({ text: 'tutor', usage: {} });

vi.mock('./ai.langgraph.js', () => ({
  runLangGraphDebate: (...args: unknown[]) => mockRunLangGraphDebate(...args),
  runLangGraphQuiz: (...args: unknown[]) => mockRunLangGraphQuiz(...args),
  runLangGraphTutor: (...args: unknown[]) => mockRunLangGraphTutor(...args),
}));

vi.mock('./langgraph.service.js', () => ({
  LangGraphService: class {
    getCheckpointer = vi.fn().mockReturnValue({ checkpoint: 'memory' });
  },
}));

vi.mock('./tools/agent-tools.js', () => ({
  buildSearchKnowledgeGraphTool: vi.fn().mockReturnValue({}),
  buildFetchCourseContentTool: vi.fn().mockReturnValue({}),
}));

vi.mock('./ai.service.db.js', () => ({
  searchKnowledgeGraph: vi.fn().mockResolvedValue([]),
  fetchContentItem: vi.fn().mockResolvedValue(null),
}));

import { AiLanggraphRunnerService } from './ai-langgraph-runner.service.js';
import { LangGraphService } from './langgraph.service.js';

describe('AiLanggraphRunnerService', () => {
  let service: AiLanggraphRunnerService;
  let langGraphSvc: LangGraphService;

  beforeEach(() => {
    vi.clearAllMocks();
    langGraphSvc = new LangGraphService();
    service = new AiLanggraphRunnerService(langGraphSvc);
  });

  // ── isLangGraphTemplate ───────────────────────────────────────────────────

  it('returns true for CHAVRUTA_DEBATE', () => {
    expect(service.isLangGraphTemplate('CHAVRUTA_DEBATE')).toBe(true);
  });

  it('returns true for QUIZ_GENERATOR', () => {
    expect(service.isLangGraphTemplate('QUIZ_GENERATOR')).toBe(true);
  });

  it('returns true for TUTOR', () => {
    expect(service.isLangGraphTemplate('TUTOR')).toBe(true);
  });

  it('returns false for legacy templates', () => {
    expect(service.isLangGraphTemplate('SUMMARIZE')).toBe(false);
    expect(service.isLangGraphTemplate('EXPLAIN')).toBe(false);
    expect(service.isLangGraphTemplate('UNKNOWN')).toBe(false);
  });

  // ── run: CHAVRUTA_DEBATE ──────────────────────────────────────────────────

  it('dispatches CHAVRUTA_DEBATE to runLangGraphDebate', async () => {
    await service.run('sess-1', 'hello', 'CHAVRUTA_DEBATE', {}, 'en');
    expect(mockRunLangGraphDebate).toHaveBeenCalledWith(
      'sess-1', 'hello', {}, 'en', expect.anything()
    );
  });

  it('dispatches QUIZ_GENERATOR to runLangGraphQuiz', async () => {
    await service.run('sess-1', 'q', 'QUIZ_GENERATOR', {}, 'he');
    expect(mockRunLangGraphQuiz).toHaveBeenCalled();
  });

  it('dispatches TUTOR to runLangGraphTutor', async () => {
    await service.run('sess-1', 'explain', 'TUTOR', { tenantId: 't1' }, 'en');
    expect(mockRunLangGraphTutor).toHaveBeenCalled();
  });

  it('returns null for non-LangGraph templates', async () => {
    const result = await service.run('sess-1', 'msg', 'SUMMARIZE', {}, 'en');
    expect(result).toBeNull();
  });

  // ── buildTutorTools ───────────────────────────────────────────────────────

  it('buildTutorTools returns object with searchKnowledgeGraph and fetchCourseContent', () => {
    const tools = service.buildTutorTools('tenant-1');
    expect(tools).toHaveProperty('searchKnowledgeGraph');
    expect(tools).toHaveProperty('fetchCourseContent');
  });
});
