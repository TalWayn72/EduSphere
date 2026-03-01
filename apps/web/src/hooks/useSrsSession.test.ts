/**
 * useSrsSession hook tests
 *
 * Verifies:
 *  1.  currentCard is null when no cards returned
 *  2.  totalDue is 0 initially (no cards)
 *  3.  fetching value is passed through from useQuery result
 *  4.  submitRating with quality>=3 increments correct count
 *  5.  submitRating with quality<3 increments incorrect count
 *  6.  submitRating advances to the next card
 *  7.  sessionComplete becomes true when the last card is reviewed
 *  8.  pause=true passed to useQuery when no userId provided
 *  9.  session stats tracking (correct + incorrect)
 * 10.  submitRating calls mutation with the current card's id
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock — MUST be before any imports ─────────────────────────────────────
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// ── srs.queries mock — MUST be before any imports ──────────────────────────────
vi.mock('@/lib/graphql/srs.queries', () => ({
  DUE_REVIEWS_QUERY: 'DUE_REVIEWS_QUERY',
  SUBMIT_REVIEW_MUTATION: 'SUBMIT_REVIEW_MUTATION',
}));

// ── Import after mocks ─────────────────────────────────────────────────────────
import { useSrsSession, type SrsCard } from './useSrsSession';
import * as urql from 'urql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(id: string, overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    id,
    conceptName: `Concept ${id}`,
    dueDate: '2026-01-01T00:00:00Z',
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lastReviewedAt: null,
    ...overrides,
  };
}

type QueryState = {
  data: { dueReviews: SrsCard[] } | undefined;
  fetching: boolean;
  error?: urql.CombinedError;
};

function setupMocks(queryState: QueryState, submitExecute?: ReturnType<typeof vi.fn>) {
  const mockSubmit = submitExecute ?? vi.fn().mockResolvedValue({ data: undefined, error: undefined });

  vi.mocked(urql.useQuery).mockReturnValue([
    queryState as unknown as ReturnType<typeof urql.useQuery>[0],
    vi.fn() as unknown as ReturnType<typeof urql.useQuery>[1],
    vi.fn() as unknown as ReturnType<typeof urql.useQuery>[2],
  ]);

  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false, data: undefined, error: undefined } as unknown as ReturnType<typeof urql.useMutation>[0],
    mockSubmit as unknown as ReturnType<typeof urql.useMutation>[1],
  ]);

  return mockSubmit;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSrsSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no cards, not fetching
    setupMocks({ data: undefined, fetching: false });
  });

  // Test 1 — currentCard is null when no cards
  it('returns currentCard=null when no cards are available', () => {
    const { result } = renderHook(() => useSrsSession('user-1'));
    expect(result.current.currentCard).toBeNull();
  });

  // Test 2 — totalDue is 0 initially
  it('returns totalDue=0 when no cards are loaded', () => {
    const { result } = renderHook(() => useSrsSession('user-1'));
    expect(result.current.totalDue).toBe(0);
  });

  // Test 3 — fetching is passed through
  it('passes fetching=true through from the useQuery result', () => {
    setupMocks({ data: undefined, fetching: true });
    const { result } = renderHook(() => useSrsSession('user-1'));
    expect(result.current.fetching).toBe(true);
  });

  // Test 4 — submitRating quality>=3 increments correct
  it('increments stats.correct when quality >= 3', () => {
    const cards = [makeCard('c1'), makeCard('c2')];
    setupMocks({ data: { dueReviews: cards }, fetching: false });

    const { result } = renderHook(() => useSrsSession('user-1'));

    act(() => {
      result.current.submitRating(4);
    });

    expect(result.current.stats.correct).toBe(1);
    expect(result.current.stats.incorrect).toBe(0);
  });

  // Test 5 — submitRating quality<3 increments incorrect
  it('increments stats.incorrect when quality < 3', () => {
    const cards = [makeCard('c1'), makeCard('c2')];
    setupMocks({ data: { dueReviews: cards }, fetching: false });

    const { result } = renderHook(() => useSrsSession('user-1'));

    act(() => {
      result.current.submitRating(1);
    });

    expect(result.current.stats.incorrect).toBe(1);
    expect(result.current.stats.correct).toBe(0);
  });

  // Test 6 — submitRating advances to the next card
  it('advances currentCard to the next card after submitRating', () => {
    const cards = [makeCard('card-A'), makeCard('card-B')];
    setupMocks({ data: { dueReviews: cards }, fetching: false });

    const { result } = renderHook(() => useSrsSession('user-1'));

    expect(result.current.currentCard?.id).toBe('card-A');

    act(() => {
      result.current.submitRating(3);
    });

    expect(result.current.currentCard?.id).toBe('card-B');
  });

  // Test 7 — sessionComplete becomes true after reviewing the last card
  it('sets sessionComplete=true when the last card is reviewed', () => {
    const cards = [makeCard('only-card')];
    setupMocks({ data: { dueReviews: cards }, fetching: false });

    const { result } = renderHook(() => useSrsSession('user-1'));

    expect(result.current.sessionComplete).toBe(false);

    act(() => {
      result.current.submitRating(5);
    });

    expect(result.current.sessionComplete).toBe(true);
  });

  // Test 8 — pause=true when no userId
  it('passes pause=true to useQuery when userId is not provided', () => {
    setupMocks({ data: undefined, fetching: false });

    renderHook(() => useSrsSession());

    const calls = vi.mocked(urql.useQuery).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({ pause: true });
  });

  // Test 9 — session stats tracking (correct + incorrect)
  it('tracks both correct and incorrect counts across multiple ratings', () => {
    const cards = [makeCard('c1'), makeCard('c2'), makeCard('c3'), makeCard('c4')];
    setupMocks({ data: { dueReviews: cards }, fetching: false });

    const { result } = renderHook(() => useSrsSession('user-1'));

    act(() => { result.current.submitRating(5); }); // correct
    act(() => { result.current.submitRating(0); }); // incorrect
    act(() => { result.current.submitRating(3); }); // correct

    expect(result.current.stats.correct).toBe(2);
    expect(result.current.stats.incorrect).toBe(1);
  });

  // Test 10 — submitRating calls mutation with the card's id
  it('calls the submit mutation with the current card id and quality', () => {
    const cards = [makeCard('card-id-123')];
    const mockSubmit = setupMocks({ data: { dueReviews: cards }, fetching: false });

    const { result } = renderHook(() => useSrsSession('user-1'));

    act(() => {
      result.current.submitRating(4);
    });

    expect(mockSubmit).toHaveBeenCalledWith({ cardId: 'card-id-123', quality: 4 });
  });
});
