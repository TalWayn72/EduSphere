import { describe, it, expect, vi } from 'vitest';
import {
  buildSearchKnowledgeGraphTool,
  buildFetchCourseContentTool,
  searchKnowledgeGraphSchema,
  fetchCourseContentSchema,
  type KnowledgeSearchResult,
  type ContentItemResult,
} from './agent-tools';

// ── searchKnowledgeGraphSchema ────────────────────────────────────────────────

describe('searchKnowledgeGraphSchema', () => {
  it('accepts a valid query with default limit', () => {
    const result = searchKnowledgeGraphSchema.safeParse({
      query: 'photosynthesis',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(5);
  });

  it('accepts a valid query with explicit limit', () => {
    const result = searchKnowledgeGraphSchema.safeParse({
      query: 'algebra',
      limit: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(10);
  });

  it('rejects when query is missing', () => {
    const result = searchKnowledgeGraphSchema.safeParse({ limit: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects when limit is below 1', () => {
    const result = searchKnowledgeGraphSchema.safeParse({
      query: 'test',
      limit: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when limit exceeds 20', () => {
    const result = searchKnowledgeGraphSchema.safeParse({
      query: 'test',
      limit: 21,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer limit', () => {
    const result = searchKnowledgeGraphSchema.safeParse({
      query: 'test',
      limit: 3.5,
    });
    expect(result.success).toBe(false);
  });
});

// ── fetchCourseContentSchema ──────────────────────────────────────────────────

describe('fetchCourseContentSchema', () => {
  it('accepts a valid UUID contentItemId', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = fetchCourseContentSchema.safeParse({ contentItemId: uuid });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const result = fetchCourseContentSchema.safeParse({
      contentItemId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when contentItemId is missing', () => {
    const result = fetchCourseContentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── buildSearchKnowledgeGraphTool ─────────────────────────────────────────────

describe('buildSearchKnowledgeGraphTool', () => {
  it('returns a tool object with a description string', () => {
    const execute =
      vi.fn<(q: string, l: number) => Promise<KnowledgeSearchResult[]>>();
    const t = buildSearchKnowledgeGraphTool(execute);
    expect(typeof t.description).toBe('string');
    expect(t.description.length).toBeGreaterThan(0);
  });

  it('returns a tool object with a parameters schema', () => {
    const execute =
      vi.fn<(q: string, l: number) => Promise<KnowledgeSearchResult[]>>();
    const t = buildSearchKnowledgeGraphTool(execute);
    expect(t.parameters).toBeDefined();
  });

  it('calls the provided execute function with query and limit', async () => {
    const mockResults: KnowledgeSearchResult[] = [
      {
        id: 'seg-1',
        text: 'photosynthesis occurs in chloroplasts',
        type: 'transcript_segment',
        similarity: 0.92,
      },
    ];
    const execute = vi.fn().mockResolvedValue(mockResults);
    const t = buildSearchKnowledgeGraphTool(execute);
    const result = await t.execute(
      { query: 'photosynthesis', limit: 3 },
      { messages: [], toolCallId: 'tc-1' }
    );
    expect(execute).toHaveBeenCalledWith('photosynthesis', 3);
    expect(result).toEqual(mockResults);
  });

  it('propagates execute rejection', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('DB unavailable'));
    const t = buildSearchKnowledgeGraphTool(execute);
    await expect(
      t.execute(
        { query: 'algebra', limit: 5 },
        { messages: [], toolCallId: 'tc-2' }
      )
    ).rejects.toThrow('DB unavailable');
  });

  it('returns an array of KnowledgeSearchResult shaped objects', async () => {
    const mockResults: KnowledgeSearchResult[] = [
      {
        id: 'id-1',
        text: 'mitochondria',
        type: 'transcript_segment',
        similarity: 0.88,
      },
      {
        id: 'id-2',
        text: 'cellular respiration',
        type: 'transcript_segment',
        similarity: 0.75,
      },
    ];
    const execute = vi.fn().mockResolvedValue(mockResults);
    const t = buildSearchKnowledgeGraphTool(execute);
    const result = (await t.execute(
      { query: 'mitochondria', limit: 5 },
      { messages: [], toolCallId: 'tc-3' }
    )) as KnowledgeSearchResult[];
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('text');
    expect(result[0]).toHaveProperty('similarity');
    expect(result[0]).toHaveProperty('type');
  });
});

// ── buildFetchCourseContentTool ───────────────────────────────────────────────

describe('buildFetchCourseContentTool', () => {
  it('returns a tool object with a description string', () => {
    const execute = vi.fn<(id: string) => Promise<ContentItemResult | null>>();
    const t = buildFetchCourseContentTool(execute);
    expect(typeof t.description).toBe('string');
    expect(t.description.length).toBeGreaterThan(0);
  });

  it('returns a tool object with a parameters schema', () => {
    const execute = vi.fn<(id: string) => Promise<ContentItemResult | null>>();
    const t = buildFetchCourseContentTool(execute);
    expect(t.parameters).toBeDefined();
  });

  it('calls the execute function with contentItemId', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const mockContent: ContentItemResult = {
      id: uuid,
      title: 'Introduction to Biology',
      type: 'course',
      content: 'This course covers...',
    };
    const execute = vi.fn().mockResolvedValue(mockContent);
    const t = buildFetchCourseContentTool(execute);
    const result = await t.execute(
      { contentItemId: uuid },
      { messages: [], toolCallId: 'tc-4' }
    );
    expect(execute).toHaveBeenCalledWith(uuid);
    expect(result).toEqual(mockContent);
  });

  it('returns null when execute resolves null (item not found)', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174001';
    const execute = vi.fn().mockResolvedValue(null);
    const t = buildFetchCourseContentTool(execute);
    const result = await t.execute(
      { contentItemId: uuid },
      { messages: [], toolCallId: 'tc-5' }
    );
    expect(result).toBeNull();
  });

  it('propagates execute rejection', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174002';
    const execute = vi.fn().mockRejectedValue(new Error('Not authorised'));
    const t = buildFetchCourseContentTool(execute);
    await expect(
      t.execute({ contentItemId: uuid }, { messages: [], toolCallId: 'tc-6' })
    ).rejects.toThrow('Not authorised');
  });

  it('returned ContentItemResult has expected shape', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174003';
    const mockContent: ContentItemResult = {
      id: uuid,
      title: 'Advanced Calculus',
      type: 'course',
      content: null,
    };
    const execute = vi.fn().mockResolvedValue(mockContent);
    const t = buildFetchCourseContentTool(execute);
    const result = (await t.execute(
      { contentItemId: uuid },
      { messages: [], toolCallId: 'tc-7' }
    )) as ContentItemResult;
    expect(result).toHaveProperty('id', uuid);
    expect(result).toHaveProperty('title', 'Advanced Calculus');
    expect(result).toHaveProperty('type', 'course');
    expect(result).toHaveProperty('content', null);
  });
});
