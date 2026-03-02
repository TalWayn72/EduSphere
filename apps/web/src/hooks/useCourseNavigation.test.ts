// vi.mock must be hoisted before any imports
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  CONTENT_ITEM_QUERY: 'CONTENT_ITEM_QUERY',
  COURSE_DETAIL_QUERY: 'COURSE_DETAIL_QUERY',
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import * as ReactRouterDom from 'react-router-dom';
import { useCourseNavigation } from './useCourseNavigation';

type UseQueryReturn = [
  { data: unknown; fetching: boolean; error: unknown },
  () => void,
];

function makeResult(
  overrides: Partial<{ data: unknown; fetching: boolean; error: unknown }>
): UseQueryReturn {
  return [
    { data: undefined, fetching: false, error: undefined, ...overrides },
    vi.fn(),
  ];
}

function makeSearchParams(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return [sp, vi.fn()] as unknown as ReturnType<
    typeof ReactRouterDom.useSearchParams
  >;
}

beforeEach(() => {
  vi.mocked(urql.useQuery).mockReturnValue(makeResult({}));
  vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
    makeSearchParams({})
  );
});

describe('useCourseNavigation', () => {
  it('returns nulls when no courseId param is present', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({})
    );
    vi.mocked(urql.useQuery).mockReturnValue(makeResult({ data: {} }));
    const { result } = renderHook(() => useCourseNavigation('item-1'), {
      wrapper: MemoryRouter,
    });
    // wait for useEffect mount
    await act(async () => {});
    expect(result.current.courseId).toBeNull();
    expect(result.current.courseTitle).toBeNull();
    expect(result.current.moduleName).toBeNull();
    expect(result.current.prevItemId).toBeNull();
    expect(result.current.nextItemId).toBeNull();
  });

  it('returns course data when query has a course', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({ courseId: 'course-1' })
    );
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          course: {
            id: 'course-1',
            title: 'Test Course',
            modules: [
              {
                id: 'mod-1',
                title: 'Module One',
                orderIndex: 0,
                contentItems: [
                  {
                    id: 'item-1',
                    title: 'Lesson 1',
                    contentType: 'VIDEO',
                    duration: 60,
                    orderIndex: 0,
                  },
                ],
              },
            ],
          },
        },
      })
    );
    const { result } = renderHook(() => useCourseNavigation('item-1'), {
      wrapper: MemoryRouter,
    });
    await act(async () => {});
    expect(result.current.courseId).toBe('course-1');
    expect(result.current.courseTitle).toBe('Test Course');
  });

  it('correctly computes prevItemId and nextItemId from sorted flat list', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({ courseId: 'course-2' })
    );
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          course: {
            id: 'course-2',
            title: 'Nav Course',
            modules: [
              {
                id: 'mod-a',
                title: 'Module A',
                orderIndex: 0,
                contentItems: [
                  {
                    id: 'item-a',
                    title: 'A',
                    contentType: 'VIDEO',
                    duration: null,
                    orderIndex: 0,
                  },
                  {
                    id: 'item-b',
                    title: 'B',
                    contentType: 'VIDEO',
                    duration: null,
                    orderIndex: 1,
                  },
                  {
                    id: 'item-c',
                    title: 'C',
                    contentType: 'VIDEO',
                    duration: null,
                    orderIndex: 2,
                  },
                ],
              },
            ],
          },
        },
      })
    );
    const { result } = renderHook(() => useCourseNavigation('item-b'), {
      wrapper: MemoryRouter,
    });
    await act(async () => {});
    expect(result.current.prevItemId).toBe('item-a');
    expect(result.current.nextItemId).toBe('item-c');
  });

  it('returns correct moduleName for found item', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({ courseId: 'course-3' })
    );
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          course: {
            id: 'course-3',
            title: 'Module Name Course',
            modules: [
              {
                id: 'mod-x',
                title: 'Special Module',
                orderIndex: 0,
                contentItems: [
                  {
                    id: 'item-x',
                    title: 'X',
                    contentType: 'DOC',
                    duration: null,
                    orderIndex: 0,
                  },
                ],
              },
            ],
          },
        },
      })
    );
    const { result } = renderHook(() => useCourseNavigation('item-x'), {
      wrapper: MemoryRouter,
    });
    await act(async () => {});
    expect(result.current.moduleName).toBe('Special Module');
  });

  it('ready=true when course data is present after mount', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({ courseId: 'course-4' })
    );
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          course: {
            id: 'course-4',
            title: 'Ready Course',
            modules: [],
          },
        },
      })
    );
    const { result } = renderHook(() => useCourseNavigation('item-1'), {
      wrapper: MemoryRouter,
    });
    await act(async () => {});
    expect(result.current.ready).toBe(true);
  });

  it('pauses query when no courseIdHint is present', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({})
    );
    vi.mocked(urql.useQuery).mockReturnValue(makeResult({}));
    renderHook(() => useCourseNavigation('item-1'), { wrapper: MemoryRouter });
    await act(async () => {});
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]?.[0] as {
      pause?: boolean;
    };
    expect(callArgs?.pause).toBe(true);
  });

  it('prevItemId is null for first item and nextItemId is null for last', async () => {
    vi.mocked(ReactRouterDom.useSearchParams).mockReturnValue(
      makeSearchParams({ courseId: 'course-5' })
    );
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          course: {
            id: 'course-5',
            title: 'Boundary Course',
            modules: [
              {
                id: 'mod-b',
                title: 'Mod B',
                orderIndex: 0,
                contentItems: [
                  {
                    id: 'first',
                    title: 'First',
                    contentType: 'VIDEO',
                    duration: null,
                    orderIndex: 0,
                  },
                  {
                    id: 'last',
                    title: 'Last',
                    contentType: 'VIDEO',
                    duration: null,
                    orderIndex: 1,
                  },
                ],
              },
            ],
          },
        },
      })
    );
    const { result: r1 } = renderHook(() => useCourseNavigation('first'), {
      wrapper: MemoryRouter,
    });
    await act(async () => {});
    expect(r1.current.prevItemId).toBeNull();

    const { result: r2 } = renderHook(() => useCourseNavigation('last'), {
      wrapper: MemoryRouter,
    });
    await act(async () => {});
    expect(r2.current.nextItemId).toBeNull();
  });
});
