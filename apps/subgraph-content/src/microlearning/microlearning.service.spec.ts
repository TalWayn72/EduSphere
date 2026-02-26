import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MicrolearningService } from './microlearning.service';
import { MICROLESSON_MAX_DURATION_SECONDS } from './microlearning.schemas';

// ─── Mock @edusphere/db ─────────────────────────────────────────────────────
vi.mock('@edusphere/db', () => {
  return {
    createDatabaseConnection: vi.fn(() => ({})),
    closeAllPools: vi.fn(),
    schema: {
      microlearningPaths: {} as ReturnType<
        (typeof import('@edusphere/db'))['schema']['microlearningPaths']
      >,
    },
    eq: vi.fn(),
    and: vi.fn(),
    withTenantContext: vi.fn(
      async (
        _db: unknown,
        _ctx: unknown,
        fn: (tx: unknown) => Promise<unknown>
      ) => fn({})
    ),
  };
});

const CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT',
} as const;

describe('MicrolearningService', () => {
  let service: MicrolearningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MicrolearningService();
  });

  // ─── validateMicrolessonContent ─────────────────────────────────────────

  it('throws BadRequestException when content is null', () => {
    expect(() => service.validateMicrolessonContent(null)).toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when content is not valid JSON', () => {
    expect(() => service.validateMicrolessonContent('not json')).toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when durationSeconds exceeds 420', () => {
    const content = JSON.stringify({
      objective: 'Learn X',
      conceptName: 'X',
      body: 'Body text',
      durationSeconds: MICROLESSON_MAX_DURATION_SECONDS + 1,
    });
    expect(() => service.validateMicrolessonContent(content)).toThrow(
      BadRequestException
    );
  });

  it('throws when durationSeconds equals exactly 421', () => {
    const content = JSON.stringify({
      objective: 'Learn X',
      conceptName: 'X',
      body: 'Body',
      durationSeconds: 421,
    });
    expect(() => service.validateMicrolessonContent(content)).toThrow(
      BadRequestException
    );
  });

  it('does NOT throw for valid content at exactly 420 seconds', () => {
    const content = JSON.stringify({
      objective: 'Learn X',
      conceptName: 'X',
      body: 'Body text here',
      durationSeconds: 420,
    });
    expect(() => service.validateMicrolessonContent(content)).not.toThrow();
  });

  it('does NOT throw for valid short content with quiz question', () => {
    const content = JSON.stringify({
      objective: 'Understand recursion',
      conceptName: 'Recursion',
      body: 'A function that calls itself.',
      durationSeconds: 180,
      quizQuestion: {
        question: 'What is recursion?',
        options: [
          { text: 'A loop', isCorrect: false },
          { text: 'A function calling itself', isCorrect: true },
        ],
      },
    });
    expect(() => service.validateMicrolessonContent(content)).not.toThrow();
  });

  it('throws when required field objective is missing', () => {
    const content = JSON.stringify({
      conceptName: 'X',
      body: 'Body',
      durationSeconds: 60,
    });
    expect(() => service.validateMicrolessonContent(content)).toThrow(
      BadRequestException
    );
  });

  // ─── MICROLESSON_MAX_DURATION_SECONDS constant ───────────────────────────

  it('MICROLESSON_MAX_DURATION_SECONDS is 420', () => {
    expect(MICROLESSON_MAX_DURATION_SECONDS).toBe(420);
  });

  // ─── getDailyLesson: no paths → returns null ─────────────────────────────

  it('getDailyLesson returns null when no paths exist', async () => {
    vi.spyOn(service, 'listPaths').mockResolvedValue([]);
    const result = await service.getDailyLesson(CTX);
    expect(result).toBeNull();
  });

  it('getDailyLesson returns first contentItemId of first path', async () => {
    vi.spyOn(service, 'listPaths').mockResolvedValue([
      {
        id: 'path-1',
        title: 'Intro Path',
        topicClusterId: null,
        contentItemIds: ['item-abc', 'item-def'],
        itemCount: 2,
        createdAt: new Date().toISOString(),
      },
    ]);
    const result = await service.getDailyLesson(CTX);
    expect(result).toBe('item-abc');
  });

  it('getDailyLesson returns null when first path has no items', async () => {
    vi.spyOn(service, 'listPaths').mockResolvedValue([
      {
        id: 'path-1',
        title: 'Empty Path',
        topicClusterId: null,
        contentItemIds: [],
        itemCount: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
    const result = await service.getDailyLesson(CTX);
    expect(result).toBeNull();
  });

  // ─── createPath input validation ─────────────────────────────────────────

  it('createPath throws BadRequestException for empty contentItemIds', async () => {
    await expect(
      service.createPath({ title: 'My Path', contentItemIds: [] }, CTX)
    ).rejects.toThrow(BadRequestException);
  });

  it('createPath throws BadRequestException for empty title', async () => {
    await expect(
      service.createPath(
        { title: '', contentItemIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'] },
        CTX
      )
    ).rejects.toThrow(BadRequestException);
  });
});
