/**
 * lesson-pipeline.resolver.spec.ts
 * Unit tests for LessonPipelineResolver.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRunLessonPipeline = vi.fn().mockResolvedValue({
  id: 'exec-1',
  status: 'COMPLETED',
  lesson: { title: 'Generated Lesson' },
});

vi.mock('../workflows/lesson-pipeline.workflow.js', () => ({
  runLessonPipeline: (...args: unknown[]) => mockRunLessonPipeline(...args),
}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi
    .fn()
    .mockReturnValue(vi.fn().mockReturnValue({ modelId: 'llama3' })),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
}));

// Mock fetch for the knowledge subgraph search function
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { LessonPipelineResolver } from './lesson-pipeline.resolver.js';
import { GraphQLError } from 'graphql';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeCtx(userId?: string, authorization?: string) {
  const ctx: Record<string, unknown> = {
    authContext: userId ? { userId, tenantId: 'tenant-1' } : null,
  };
  if (authorization) ctx['authorization'] = authorization;
  return ctx;
}

const VALID_INPUT = {
  topic: 'TypeScript Generics',
  contentItemId: 'ci-1',
  lessonType: 'LECTURE',
};

describe('LessonPipelineResolver', () => {
  let resolver: LessonPipelineResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LessonPipelineResolver();
  });

  describe('generateLesson', () => {
    it('throws UNAUTHORIZED when no authContext', async () => {
      await expect(
        resolver.generateLesson(VALID_INPUT, makeCtx() as never)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver.generateLesson(VALID_INPUT, makeCtx() as never)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHORIZED' },
      });
    });

    it('throws UNAUTHORIZED when userId is missing', async () => {
      const ctx = { authContext: { tenantId: 'tenant-1' } };
      await expect(
        resolver.generateLesson(VALID_INPUT, ctx as never)
      ).rejects.toThrow(GraphQLError);
    });

    it('calls runLessonPipeline with input, model, id, and searchFn', async () => {
      const ctx = makeCtx('user-1');
      const result = await resolver.generateLesson(VALID_INPUT, ctx as never);

      expect(mockRunLessonPipeline).toHaveBeenCalledWith(
        VALID_INPUT,
        expect.anything(), // model
        'test-uuid-1234', // executionId
        expect.any(Function) // searchFn
      );
      expect(result).toEqual({
        id: 'exec-1',
        status: 'COMPLETED',
        lesson: { title: 'Generated Lesson' },
      });
    });

    it('passes authorization header to search function', async () => {
      const ctx = makeCtx('user-1', 'Bearer tok-123');
      await resolver.generateLesson(VALID_INPUT, ctx as never);

      // Extract the searchFn that was passed to runLessonPipeline
      const searchFn = mockRunLessonPipeline.mock.calls[0][3] as (
        query: string,
        limit: number
      ) => Promise<unknown>;

      // Mock the knowledge subgraph response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            searchSemantic: [
              {
                id: 's-1',
                text: 'segment text',
                similarity: 0.95,
                entityType: 'concept',
              },
            ],
          },
        }),
      });

      const results = await searchFn('TypeScript', 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer tok-123',
          }),
        })
      );
      expect(results).toEqual([
        {
          id: 's-1',
          text: 'segment text',
          similarity: 0.95,
          source: 'concept',
        },
      ]);
    });

    it('search function handles HTTP error from knowledge subgraph', async () => {
      const ctx = makeCtx('user-1');
      await resolver.generateLesson(VALID_INPUT, ctx as never);

      const searchFn = mockRunLessonPipeline.mock.calls[0][3] as (
        query: string,
        limit: number
      ) => Promise<unknown>;

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(searchFn('fail', 5)).rejects.toThrow(
        'Knowledge subgraph HTTP 503'
      );
    });

    it('search function returns empty array when no results', async () => {
      const ctx = makeCtx('user-1');
      await resolver.generateLesson(VALID_INPUT, ctx as never);

      const searchFn = mockRunLessonPipeline.mock.calls[0][3] as (
        query: string,
        limit: number
      ) => Promise<unknown>;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { searchSemantic: null } }),
      });

      const results = await searchFn('nothing', 5);
      expect(results).toEqual([]);
    });

    it('search function works without authorization header', async () => {
      const ctx = makeCtx('user-1'); // no authorization key
      await resolver.generateLesson(VALID_INPUT, ctx as never);

      const searchFn = mockRunLessonPipeline.mock.calls[0][3] as (
        query: string,
        limit: number
      ) => Promise<unknown>;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { searchSemantic: [] } }),
      });

      await searchFn('test', 3);

      const headers = mockFetch.mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});
