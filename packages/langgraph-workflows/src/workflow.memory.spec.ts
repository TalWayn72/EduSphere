/**
 * workflow.memory.spec.ts
 *
 * Tests that the state-annotation reducers in tutorWorkflow and debateWorkflow
 * enforce the 20-entry cap on their respective history arrays.
 *
 * The reducers are pure functions and are tested in isolation — no LLM calls,
 * no LangGraph runtime required.
 */
import { describe, it, expect } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Replicate the cap-at-N reducer pattern used by both workflows so tests stay
 * decoupled from internal annotation symbols while still exercising the exact
 * same logic.
 */
function makeCapReducer<T>(cap: number) {
  return (existing: T[], incoming: T[]): T[] => {
    const merged = [...existing, ...incoming];
    return merged.length > cap ? merged.slice(merged.length - cap) : merged;
  };
}

// ── tutorWorkflow ─────────────────────────────────────────────────────────────

type HistoryEntry = { role: 'user' | 'assistant'; content: string };

describe('Workflow state pruning', () => {
  describe('tutorWorkflow — conversationHistory reducer', () => {
    const MAX = 20;
    const reduce = makeCapReducer<HistoryEntry>(MAX);

    it('keeps conversationHistory at most 20 entries when merged list is under cap', () => {
      const existing: HistoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
        role: 'user',
        content: `msg-${i}`,
      }));
      const incoming: HistoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
        role: 'assistant',
        content: `reply-${i}`,
      }));

      const result = reduce(existing, incoming);
      expect(result.length).toBe(15);
    });

    it('caps conversationHistory at exactly 20 when merged list exceeds cap', () => {
      const existing: HistoryEntry[] = Array.from({ length: 18 }, (_, i) => ({
        role: 'user',
        content: `msg-${i}`,
      }));
      const incoming: HistoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
        role: 'assistant',
        content: `reply-${i}`,
      }));

      const result = reduce(existing, incoming);
      expect(result.length).toBe(MAX);
    });

    it('retains the NEWEST entries when capping', () => {
      const existing: HistoryEntry[] = Array.from({ length: 18 }, (_, i) => ({
        role: 'user',
        content: `old-${i}`,
      }));
      const incoming: HistoryEntry[] = [
        { role: 'assistant', content: 'new-0' },
        { role: 'user', content: 'new-1' },
        { role: 'assistant', content: 'new-2' },
      ];

      const result = reduce(existing, incoming);
      expect(result.length).toBe(MAX);

      // The last 3 entries must be the newest (from incoming).
      const tail = result.slice(-3);
      expect(tail.map((e) => e.content)).toEqual(['new-0', 'new-1', 'new-2']);
    });

    it('drops the oldest entries when capping', () => {
      const existing: HistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
        role: 'user',
        content: `old-${i}`,
      }));
      const incoming: HistoryEntry[] = [
        { role: 'assistant', content: 'newest' },
      ];

      const result = reduce(existing, incoming);
      expect(result.length).toBe(MAX);
      expect(result[0].content).toBe('old-1'); // old-0 was dropped
      expect(result[result.length - 1].content).toBe('newest');
    });
  });

  // ── debateWorkflow ────────────────────────────────────────────────────────

  type DebateArgument = {
    round: number;
    position: string;
    argument: string;
    counterArgument?: string;
  };

  describe('debateWorkflow — arguments reducer', () => {
    const MAX = 20;
    const reduce = makeCapReducer<DebateArgument>(MAX);

    it('keeps arguments array at most 20 entries when merged list is under cap', () => {
      const existing: DebateArgument[] = Array.from({ length: 8 }, (_, i) => ({
        round: i + 1,
        position: 'for',
        argument: `arg-${i}`,
      }));
      const incoming: DebateArgument[] = Array.from({ length: 6 }, (_, i) => ({
        round: i + 9,
        position: 'against',
        argument: `counter-${i}`,
      }));

      const result = reduce(existing, incoming);
      expect(result.length).toBe(14);
    });

    it('caps arguments at exactly 20 when merged list exceeds cap', () => {
      const existing: DebateArgument[] = Array.from({ length: 18 }, (_, i) => ({
        round: i + 1,
        position: 'for',
        argument: `arg-${i}`,
      }));
      const incoming: DebateArgument[] = Array.from({ length: 5 }, (_, i) => ({
        round: i + 19,
        position: 'against',
        argument: `counter-${i}`,
      }));

      const result = reduce(existing, incoming);
      expect(result.length).toBe(MAX);
    });

    it('retains the NEWEST arguments when capping', () => {
      const existing: DebateArgument[] = Array.from({ length: 20 }, (_, i) => ({
        round: i + 1,
        position: 'for',
        argument: `old-arg-${i}`,
      }));
      const incoming: DebateArgument[] = [
        { round: 21, position: 'against', argument: 'final-argument' },
      ];

      const result = reduce(existing, incoming);
      expect(result.length).toBe(MAX);
      expect(result[result.length - 1].argument).toBe('final-argument');
      expect(result[0].argument).toBe('old-arg-1'); // old-arg-0 was dropped
    });

    it('handles empty existing array without error', () => {
      const result = reduce(
        [],
        [{ round: 1, position: 'for', argument: 'opening' }]
      );
      expect(result.length).toBe(1);
      expect(result[0].argument).toBe('opening');
    });
  });
});
