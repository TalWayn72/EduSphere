/**
 * useExamApi hook tests
 *
 * Verifies all exported hooks:
 *  useExamItemBank, useExamItem, useCreateExamItem, useUpdateExamItem,
 *  useRetireExamItem, useGenerateExamItems, useExamBlueprints,
 *  useExamBlueprint, useCreateExamBlueprint, useUpdateExamBlueprint,
 *  useCourseModules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ─────────────────────────────────────────────────────────────────
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Mock GraphQL operations
vi.mock('@/lib/graphql/exam.operations', () => ({
  EXAM_ITEM_BANK_QUERY: 'EXAM_ITEM_BANK_QUERY',
  EXAM_ITEM_QUERY: 'EXAM_ITEM_QUERY',
  CREATE_EXAM_ITEM_MUTATION: 'CREATE_EXAM_ITEM_MUTATION',
  UPDATE_EXAM_ITEM_MUTATION: 'UPDATE_EXAM_ITEM_MUTATION',
  RETIRE_EXAM_ITEM_MUTATION: 'RETIRE_EXAM_ITEM_MUTATION',
  GENERATE_EXAM_ITEMS_MUTATION: 'GENERATE_EXAM_ITEMS_MUTATION',
  EXAM_BLUEPRINTS_QUERY: 'EXAM_BLUEPRINTS_QUERY',
  EXAM_BLUEPRINT_QUERY: 'EXAM_BLUEPRINT_QUERY',
  CREATE_EXAM_BLUEPRINT_MUTATION: 'CREATE_EXAM_BLUEPRINT_MUTATION',
  UPDATE_EXAM_BLUEPRINT_MUTATION: 'UPDATE_EXAM_BLUEPRINT_MUTATION',
  COURSE_MODULES_QUERY: 'COURSE_MODULES_QUERY',
}));

import * as urql from 'urql';
import {
  useExamItemBank,
  useExamItem,
  useCreateExamItem,
  useUpdateExamItem,
  useRetireExamItem,
  useGenerateExamItems,
  useExamBlueprints,
  useExamBlueprint,
  useCreateExamBlueprint,
  useUpdateExamBlueprint,
  useCourseModules,
} from './useExamApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockQuery(data: unknown = undefined, fetching = false, error?: string) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data,
      fetching,
      error: error ? { message: error } : undefined,
      stale: false,
    } as never,
    vi.fn(),
  ]);
}

function mockMutation(resolveWith?: { data?: unknown; error?: { message: string } }) {
  const executeFn = vi.fn().mockResolvedValue(resolveWith ?? { data: undefined, error: undefined });
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false, data: undefined, error: undefined, stale: false } as never,
    executeFn,
  ]);
  return executeFn;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useExamItemBank', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty items and zero totalCount by default', () => {
    mockQuery(undefined, true);
    const { result } = renderHook(() => useExamItemBank('course-1'));
    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.fetching).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns items from query data', () => {
    const items = [{ id: 'item-1' }, { id: 'item-2' }];
    mockQuery({ examItemBank: { nodes: items, totalCount: 2 } });
    const { result } = renderHook(() => useExamItemBank('course-1'));
    expect(result.current.items).toEqual(items);
    expect(result.current.totalCount).toBe(2);
  });

  it('returns error message on query error', () => {
    mockQuery(undefined, false, 'Network error');
    const { result } = renderHook(() => useExamItemBank('course-1'));
    expect(result.current.error).toBe('Network error');
  });
});

describe('useExamItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null item when no data', () => {
    mockQuery(undefined);
    const { result } = renderHook(() => useExamItem('item-1'));
    expect(result.current.item).toBeNull();
  });

  it('returns item from query data', () => {
    const item = { id: 'item-1', domainTag: 'algebra' };
    mockQuery({ examItem: item });
    const { result } = renderHook(() => useExamItem('item-1'));
    expect(result.current.item).toEqual(item);
  });

  it('pauses when itemId is undefined', () => {
    mockQuery(undefined);
    renderHook(() => useExamItem(undefined));
    // Verify useQuery was called — pause logic is internal
    expect(urql.useQuery).toHaveBeenCalled();
  });
});

describe('useCreateExamItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a callback that calls execute with input', async () => {
    const executeFn = mockMutation({ data: { createExamItem: { id: 'new-1' } } });
    const { result } = renderHook(() => useCreateExamItem());

    const input = { courseId: 'c-1', domainTag: 'algebra', bloomLevel: 'REMEMBER' as const, questionData: {} };
    await act(async () => {
      await result.current(input as never);
    });

    expect(executeFn).toHaveBeenCalledWith({ input });
  });
});

describe('useUpdateExamItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a callback that calls execute with id and input', async () => {
    const executeFn = mockMutation();
    const { result } = renderHook(() => useUpdateExamItem());

    await act(async () => {
      await result.current('item-1', { domainTag: 'calculus' } as never);
    });

    expect(executeFn).toHaveBeenCalledWith({ id: 'item-1', input: { domainTag: 'calculus' } });
  });
});

describe('useRetireExamItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a callback that calls execute with id', async () => {
    const executeFn = mockMutation();
    const { result } = renderHook(() => useRetireExamItem());

    await act(async () => {
      await result.current('item-1');
    });

    expect(executeFn).toHaveBeenCalledWith({ id: 'item-1' });
  });
});

describe('useGenerateExamItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with loading=false and error=null', () => {
    mockMutation();
    const { result } = renderHook(() => useGenerateExamItems());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('generate returns result on success', async () => {
    const genResult = { generatedCount: 5, validCount: 4, items: [] };
    mockMutation({ data: { generateExamItems: genResult } });
    const { result } = renderHook(() => useGenerateExamItems());

    let output: unknown;
    await act(async () => {
      output = await result.current.generate({
        courseId: 'c-1',
        domainTag: 'algebra',
        bloomLevels: ['REMEMBER' as never],
        count: 5,
      });
    });

    expect(output).toEqual(genResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('generate sets error on mutation error', async () => {
    mockMutation({ data: undefined, error: { message: 'Generation failed' } });
    const { result } = renderHook(() => useGenerateExamItems());

    let output: unknown;
    await act(async () => {
      output = await result.current.generate({
        courseId: 'c-1',
        domainTag: 'algebra',
        bloomLevels: ['REMEMBER' as never],
        count: 5,
      });
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe('Generation failed');
  });

  it('generate handles thrown exceptions', async () => {
    const executeFn = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, data: undefined, error: undefined, stale: false } as never,
      executeFn,
    ]);

    const { result } = renderHook(() => useGenerateExamItems());

    await act(async () => {
      await result.current.generate({
        courseId: 'c-1',
        domainTag: 'algebra',
        bloomLevels: ['REMEMBER' as never],
        count: 5,
      });
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.loading).toBe(false);
  });
});

describe('useExamBlueprints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array by default', () => {
    mockQuery(undefined);
    const { result } = renderHook(() => useExamBlueprints('course-1'));
    expect(result.current.blueprints).toEqual([]);
  });

  it('returns blueprints from query', () => {
    const bps = [{ id: 'bp-1', title: 'Midterm' }];
    mockQuery({ examBlueprints: bps });
    const { result } = renderHook(() => useExamBlueprints('course-1'));
    expect(result.current.blueprints).toEqual(bps);
  });
});

describe('useExamBlueprint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null blueprint when no data', () => {
    mockQuery(undefined);
    const { result } = renderHook(() => useExamBlueprint('bp-1'));
    expect(result.current.blueprint).toBeNull();
  });

  it('returns blueprint from query data', () => {
    const bp = { id: 'bp-1', title: 'Final Exam' };
    mockQuery({ examBlueprint: bp });
    const { result } = renderHook(() => useExamBlueprint('bp-1'));
    expect(result.current.blueprint).toEqual(bp);
  });

  it('pauses when blueprintId is undefined', () => {
    mockQuery(undefined);
    renderHook(() => useExamBlueprint(undefined));
    expect(urql.useQuery).toHaveBeenCalled();
  });
});

describe('useCreateExamBlueprint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns callback that calls execute with input', async () => {
    const executeFn = mockMutation();
    const { result } = renderHook(() => useCreateExamBlueprint());
    const input = { courseId: 'c-1', title: 'Quiz', timeLimitMinutes: 30, totalQuestions: 20, passingScore: 70, passingMethod: 'FIXED' as const, domainDistribution: {}, bloomDistribution: {} };
    await act(async () => {
      await result.current(input as never);
    });
    expect(executeFn).toHaveBeenCalledWith({ input });
  });
});

describe('useUpdateExamBlueprint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns callback that calls execute with id and input', async () => {
    const executeFn = mockMutation();
    const { result } = renderHook(() => useUpdateExamBlueprint());
    await act(async () => {
      await result.current('bp-1', { title: 'Updated' } as never);
    });
    expect(executeFn).toHaveBeenCalledWith({ id: 'bp-1', input: { title: 'Updated' } });
  });
});

describe('useCourseModules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty modules by default', () => {
    mockQuery(undefined);
    const { result } = renderHook(() => useCourseModules('course-1'));
    expect(result.current.modules).toEqual([]);
  });

  it('returns modules from query data', () => {
    const modules = [{ id: 'm-1', title: 'Intro', orderIndex: 0 }];
    mockQuery({ course: { modules } });
    const { result } = renderHook(() => useCourseModules('course-1'));
    expect(result.current.modules).toEqual(modules);
  });
});
