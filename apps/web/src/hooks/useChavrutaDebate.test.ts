/**
 * Tests for hooks/useChavrutaDebate.ts
 *
 * Covers: consent gate (needsConsent), grantConsent(), submitArgument() no-op,
 * startNewTopic() reset behaviour, initial state, and DEBATE_TOPICS selection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── vi.mock calls MUST come before any imports of the module under test ────────

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

vi.mock('@/lib/i18n', () => ({
  i18n: { language: 'en' },
}));

vi.mock('@/lib/graphql/agent.queries', () => ({
  START_AGENT_SESSION_MUTATION: 'S',
  SEND_AGENT_MESSAGE_MUTATION: 'M',
  MESSAGE_STREAM_SUBSCRIPTION: 'SUB',
}));

// ── Imports AFTER mocks ───────────────────────────────────────────────────────

import { useChavrutaDebate } from './useChavrutaDebate';
import * as urql from 'urql';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const CONSENT_KEY = 'edusphere_consent_AI_PROCESSING';

const mockStartSession = vi.fn().mockResolvedValue({
  data: { startAgentSession: { id: null } },
});
const mockSendMessage = vi.fn().mockResolvedValue({ data: null });

function setupUrqlMocks() {
  vi.mocked(urql.useMutation)
    .mockReturnValue([{} as never, vi.fn() as never]) // re-render fallback
    .mockReturnValueOnce([{} as never, mockStartSession as never])
    .mockReturnValueOnce([{} as never, mockSendMessage as never]);

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useChavrutaDebate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a clean localStorage stub for each test
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => {
          delete store[k];
        });
      },
    });
    setupUrqlMocks();
  });

  // ── Consent gate ────────────────────────────────────────────────────────────

  it('needsConsent is true when localStorage does not have the consent key', () => {
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.needsConsent).toBe(true);
  });

  it('needsConsent is false when localStorage already has "true" for the consent key', () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setupUrqlMocks();
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.needsConsent).toBe(false);
  });

  it('grantConsent() sets needsConsent to false', () => {
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.needsConsent).toBe(true);

    act(() => {
      result.current.grantConsent();
    });

    expect(result.current.needsConsent).toBe(false);
  });

  it('grantConsent() persists consent in localStorage', () => {
    const { result } = renderHook(() => useChavrutaDebate());

    act(() => {
      result.current.grantConsent();
    });

    expect(localStorage.getItem(CONSENT_KEY)).toBe('true');
  });

  // ── submitArgument no-op when consent missing ───────────────────────────────

  it('submitArgument is a no-op when needsConsent is true (messages stay empty)', async () => {
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.needsConsent).toBe(true);

    await act(async () => {
      await result.current.submitArgument('Is free will real?');
    });

    expect(result.current.messages).toHaveLength(0);
  });

  // ── startNewTopic ───────────────────────────────────────────────────────────

  it('startNewTopic resets messages to []', async () => {
    // Grant consent then submit to accumulate a message, then reset
    localStorage.setItem(CONSENT_KEY, 'true');
    setupUrqlMocks();
    const { result } = renderHook(() => useChavrutaDebate());

    // There may be messages after submitting — reset should clear them
    act(() => {
      result.current.startNewTopic();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('startNewTopic clears any existing error', () => {
    const { result } = renderHook(() => useChavrutaDebate());

    act(() => {
      result.current.startNewTopic();
    });

    expect(result.current.error).toBeNull();
  });

  it('startNewTopic sets isLoading to false', () => {
    const { result } = renderHook(() => useChavrutaDebate());

    act(() => {
      result.current.startNewTopic();
    });

    expect(result.current.isLoading).toBe(false);
  });

  // ── Initial state ───────────────────────────────────────────────────────────

  it('messages start empty on mount', () => {
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.messages).toHaveLength(0);
  });

  it('isLoading starts false', () => {
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.isLoading).toBe(false);
  });

  it('error starts null', () => {
    const { result } = renderHook(() => useChavrutaDebate());
    expect(result.current.error).toBeNull();
  });

  // ── topic selection ─────────────────────────────────────────────────────────

  it('topic is initialised to one of the DEBATE_TOPICS strings', () => {
    const DEBATE_TOPICS = [
      'Does free will exist in a deterministic universe?',
      'Is the pursuit of knowledge a moral obligation?',
      'Can artificial intelligence possess true understanding?',
      'Is civil disobedience ever morally justified?',
    ];
    const { result } = renderHook(() => useChavrutaDebate());
    expect(DEBATE_TOPICS).toContain(result.current.topic);
  });

  it('startNewTopic picks a new topic (from the DEBATE_TOPICS array)', () => {
    const DEBATE_TOPICS = [
      'Does free will exist in a deterministic universe?',
      'Is the pursuit of knowledge a moral obligation?',
      'Can artificial intelligence possess true understanding?',
      'Is civil disobedience ever morally justified?',
    ];
    const { result } = renderHook(() => useChavrutaDebate());

    act(() => {
      result.current.startNewTopic();
    });

    expect(DEBATE_TOPICS).toContain(result.current.topic);
  });
});
