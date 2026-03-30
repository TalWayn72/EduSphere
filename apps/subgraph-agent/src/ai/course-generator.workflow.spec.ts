/**
 * course-generator.workflow.spec.ts
 * Unit tests for the course generator LangGraph workflow.
 *
 * NOTE: resolveOllamaModel() caches the resolved model in a module-level
 * variable (_resolvedModel). Once test #1 resolves it via /api/tags,
 * all subsequent tests reuse the cached value and skip the /api/tags call.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGenerateObject = vi.fn();

vi.mock('ai', () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn().mockReturnValue(
    vi.fn().mockReturnValue({ modelId: 'gpt-4o-mini' }),
  ),
}));

vi.mock('@edusphere/config', () => ({
  ollamaConfig: { url: 'http://localhost:11434' },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  CourseSchema,
  createCourseGeneratorWorkflow,
  type GeneratedCourse,
} from './course-generator.workflow.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_COURSE: GeneratedCourse = {
  title: 'Intro to TypeScript',
  description: 'A beginner course',
  modules: [
    {
      title: 'Module 1 - Basics',
      description: 'Types and syntax',
      contentItemTitles: ['Variables', 'Functions'],
    },
    {
      title: 'Module 2 - Advanced',
      description: 'Generics and decorators',
      contentItemTitles: ['Generics', 'Mapped Types'],
    },
  ],
};

/** Helper: mock a successful /api/chat response */
function mockChatResponse(course: Record<string, unknown> = VALID_COURSE) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      message: { content: JSON.stringify(course) },
    }),
  });
}

/** Helper: mock /api/tags then /api/chat for the FIRST test */
function mockTagsAndChat(
  models: string[] = ['qwen2.5:0.5b'],
  course: Record<string, unknown> = VALID_COURSE,
) {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: models.map((name) => ({ name })),
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: { content: JSON.stringify(course) },
      }),
    });
}

// ── Schema tests ─────────────────────────────────────────────────────────────

describe('CourseSchema', () => {
  it('parses a valid course object', () => {
    const result = CourseSchema.parse(VALID_COURSE);
    expect(result.title).toBe('Intro to TypeScript');
    expect(result.modules).toHaveLength(2);
  });

  it('rejects empty modules array', () => {
    expect(() =>
      CourseSchema.parse({ ...VALID_COURSE, modules: [] }),
    ).toThrow();
  });

  it('rejects more than 20 modules', () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      title: `Module ${i}`,
      description: '',
      contentItemTitles: [],
    }));
    expect(() =>
      CourseSchema.parse({ ...VALID_COURSE, modules: tooMany }),
    ).toThrow();
  });

  it('defaults description to empty string', () => {
    const result = CourseSchema.parse({ title: 'Test', modules: [{ title: 'M1' }] });
    expect(result.description).toBe('');
    expect(result.modules[0].description).toBe('');
  });

  it('defaults contentItemTitles to empty array', () => {
    const result = CourseSchema.parse({
      title: 'Test',
      modules: [{ title: 'M1', description: 'x' }],
    });
    expect(result.modules[0].contentItemTitles).toEqual([]);
  });
});

// ── Workflow tests ───────────────────────────────────────────────────────────

describe('createCourseGeneratorWorkflow', () => {
  const originalEnv = { ...process.env };
  // Track whether _resolvedModel is cached across tests
  let _modelCached = false;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns a compiled LangGraph workflow', () => {
    const workflow = createCourseGeneratorWorkflow();
    expect(workflow).toBeDefined();
    expect(typeof workflow.invoke).toBe('function');
  });

  it('generates outline via Ollama when no OPENAI_API_KEY', async () => {
    // First test: /api/tags is called to resolve model, then cached
    mockTagsAndChat(['qwen2.5:0.5b'], VALID_COURSE);
    _modelCached = true;

    const workflow = createCourseGeneratorWorkflow();
    const result = await workflow.invoke({
      prompt: 'TypeScript course',
      conceptNames: [],
    });

    expect(result.courseOutline).toBeDefined();
    expect(result.courseOutline?.title).toBe('Intro to TypeScript');
    expect(result.conceptNames).toContain('Intro to TypeScript');
    expect(result.conceptNames).toContain('Module 1 - Basics');
  });

  it('extracts concept names from outline modules', async () => {
    // Model cached from previous test — only /api/chat needed
    mockChatResponse(VALID_COURSE);

    const workflow = createCourseGeneratorWorkflow();
    const result = await workflow.invoke({
      prompt: 'TS',
      conceptNames: [],
    });

    expect(result.conceptNames).toEqual([
      'Intro to TypeScript',
      'Module 1 - Basics',
      'Module 2 - Advanced',
    ]);
  });

  it('handles Ollama connection error gracefully', async () => {
    // /api/chat fails — model is cached so only 1 fetch call
    mockFetch.mockRejectedValueOnce(new Error('fetch failed: ECONNREFUSED'));

    const workflow = createCourseGeneratorWorkflow();
    const result = await workflow.invoke({
      prompt: 'fail course',
      conceptNames: [],
    });

    expect(result.error).toBeDefined();
    expect(result.error).toContain('LLM service unavailable');
    expect(result.conceptNames).toEqual([]);
  });

  it('handles Ollama empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { content: '' } }),
    });

    const workflow = createCourseGeneratorWorkflow();
    const result = await workflow.invoke({
      prompt: 'empty test',
      conceptNames: [],
    });

    expect(result.error).toContain('Ollama returned empty response');
  });

  it('normalizes content_items field name to contentItemTitles', async () => {
    const courseWithAltNames = {
      title: 'Alt Names',
      description: '',
      modules: [
        { title: 'M1', description: '', content_items: ['Lesson A', 'Lesson B'] },
      ],
    };
    mockChatResponse(courseWithAltNames);

    const workflow = createCourseGeneratorWorkflow();
    const result = await workflow.invoke({
      prompt: 'alt',
      conceptNames: [],
    });

    expect(result.courseOutline?.modules[0].contentItemTitles).toEqual([
      'Lesson A',
      'Lesson B',
    ]);
  });

  it('uses OPENAI_API_KEY when set', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_COURSE });

    const workflow = createCourseGeneratorWorkflow();
    const result = await workflow.invoke({
      prompt: 'cloud course',
      conceptNames: [],
    });

    expect(mockGenerateObject).toHaveBeenCalled();
    expect(result.courseOutline?.title).toBe('Intro to TypeScript');
  });
});
