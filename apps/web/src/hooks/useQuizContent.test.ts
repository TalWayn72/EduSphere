// vi.mock must be hoisted before any imports
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
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

vi.mock('../lib/quiz-schema-client', () => ({
  QuizContentSchema: { safeParse: vi.fn() },
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as urql from 'urql';
import { QuizContentSchema } from '../lib/quiz-schema-client';
import { useQuizContent } from './useQuizContent';

type UseQueryReturn = [{ data: unknown; fetching: boolean; error: unknown }, () => void];

function makeResult(overrides: Partial<{ data: unknown; fetching: boolean; error: unknown }>): UseQueryReturn {
  return [{ data: undefined, fetching: false, error: undefined, ...overrides }, vi.fn()];
}

beforeEach(() => {
  vi.mocked(urql.useQuery).mockReturnValue(makeResult({}));
  vi.mocked(QuizContentSchema.safeParse).mockReturnValue({ success: false } as ReturnType<typeof QuizContentSchema.safeParse>);
});

describe('useQuizContent', () => {
  it('isQuiz=false for non-QUIZ contentType', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { contentItem: { id: 'ci-1', contentType: 'VIDEO', title: 'Vid', content: null } } })
    );
    const { result } = renderHook(() => useQuizContent('ci-1'));
    expect(result.current.isQuiz).toBe(false);
    expect(result.current.quizContent).toBeNull();
  });

  it('isQuiz=true for QUIZ contentType', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { contentItem: { id: 'ci-2', contentType: 'QUIZ', title: 'My Quiz', content: null } } })
    );
    const { result } = renderHook(() => useQuizContent('ci-2'));
    expect(result.current.isQuiz).toBe(true);
  });

  it('quizContent=null when JSON content is invalid', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { contentItem: { id: 'ci-3', contentType: 'QUIZ', title: 'Bad JSON', content: '{invalid' } } })
    );
    const { result } = renderHook(() => useQuizContent('ci-3'));
    expect(result.current.quizContent).toBeNull();
  });

  it('quizContent parsed when JSON is valid and schema succeeds', () => {
    const parsedData = {
      items: [],
      randomizeOrder: false,
      showExplanations: true,
      passingScore: 80,
    };
    vi.mocked(QuizContentSchema.safeParse).mockReturnValue({
      success: true,
      data: parsedData,
    } as unknown as ReturnType<typeof QuizContentSchema.safeParse>);
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          contentItem: {
            id: 'ci-4',
            contentType: 'QUIZ',
            title: 'Valid Quiz',
            content: JSON.stringify(parsedData),
          },
        },
      })
    );
    const { result } = renderHook(() => useQuizContent('ci-4'));
    expect(result.current.quizContent).toEqual(parsedData);
  });

  it('fetching is passed through from result', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeResult({ fetching: true }));
    const { result } = renderHook(() => useQuizContent('ci-5'));
    expect(result.current.fetching).toBe(true);
  });

  it('error is null when no error', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { contentItem: { id: 'ci-6', contentType: 'VIDEO', title: 'T', content: null } } })
    );
    const { result } = renderHook(() => useQuizContent('ci-6'));
    expect(result.current.error).toBeNull();
  });

  it('error.message is returned when query errors', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ error: { message: 'Query failed' } as unknown })
    );
    const { result } = renderHook(() => useQuizContent('ci-7'));
    expect(result.current.error).toBe('Query failed');
  });

  it('pauses query when contentItemId is empty', () => {
    renderHook(() => useQuizContent(''));
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]?.[0] as { pause?: boolean };
    expect(callArgs?.pause).toBe(true);
  });

  it('quizContent=null when safeParse returns success=false for valid JSON', () => {
    vi.mocked(QuizContentSchema.safeParse).mockReturnValue({ success: false } as ReturnType<typeof QuizContentSchema.safeParse>);
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          contentItem: {
            id: 'ci-8',
            contentType: 'QUIZ',
            title: 'Schema Fail',
            content: JSON.stringify({ items: [] }),
          },
        },
      })
    );
    const { result } = renderHook(() => useQuizContent('ci-8'));
    expect(result.current.quizContent).toBeNull();
  });
});
