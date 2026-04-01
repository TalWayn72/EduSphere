/**
 * exam-session.store tests
 *
 * Verifies all Zustand store actions: setSession, setAnswer, toggleFlag,
 * goToQuestion, nextQuestion, previousQuestion, decrementTime, reset.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useExamSessionStore } from './exam-session.store';
import type { ExamQuestion } from './exam-session.store';

// ── Fixtures ────────────────────────────────────────────────────────────────

const QUESTIONS: ExamQuestion[] = [
  {
    itemId: 'item-1',
    questionData: {
      type: 'MULTIPLE_CHOICE',
      question: 'Q1',
      options: [],
      correctOptionIds: [],
    },
    domain: 'Math',
    bloomLevel: 'APPLY',
  },
  {
    itemId: 'item-2',
    questionData: {
      type: 'MULTIPLE_CHOICE',
      question: 'Q2',
      options: [],
      correctOptionIds: [],
    },
    domain: 'Science',
    bloomLevel: 'ANALYZE',
  },
  {
    itemId: 'item-3',
    questionData: { type: 'FILL_BLANK', question: 'Q3', correctAnswer: '42' },
    domain: 'Math',
    bloomLevel: 'REMEMBER',
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('exam-session.store', () => {
  beforeEach(() => {
    useExamSessionStore.getState().reset();
  });

  it('setSession initializes all state correctly', () => {
    useExamSessionStore.getState().setSession('sess-1', QUESTIONS, 3600);
    const s = useExamSessionStore.getState();

    expect(s.sessionId).toBe('sess-1');
    expect(s.questions).toHaveLength(3);
    expect(s.timeRemaining).toBe(3600);
    expect(s.currentIndex).toBe(0);
    expect(Object.keys(s.answers)).toHaveLength(0);
    expect(s.flagged.size).toBe(0);
    expect(s.isSubmitting).toBe(false);
  });

  it('setAnswer updates the answers map', () => {
    useExamSessionStore.getState().setAnswer('item-1', ['opt-a']);
    expect(useExamSessionStore.getState().answers['item-1']).toEqual(['opt-a']);
  });

  it('toggleFlag adds and removes from flagged set', () => {
    useExamSessionStore.getState().toggleFlag('item-1');
    expect(useExamSessionStore.getState().flagged.has('item-1')).toBe(true);

    useExamSessionStore.getState().toggleFlag('item-1');
    expect(useExamSessionStore.getState().flagged.has('item-1')).toBe(false);
  });

  it('goToQuestion sets currentIndex within bounds', () => {
    useExamSessionStore.getState().setSession('s', QUESTIONS, 100);

    useExamSessionStore.getState().goToQuestion(2);
    expect(useExamSessionStore.getState().currentIndex).toBe(2);

    // Out of bounds — should not change
    useExamSessionStore.getState().goToQuestion(10);
    expect(useExamSessionStore.getState().currentIndex).toBe(2);

    useExamSessionStore.getState().goToQuestion(-1);
    expect(useExamSessionStore.getState().currentIndex).toBe(2);
  });

  it('nextQuestion increments and stops at end', () => {
    useExamSessionStore.getState().setSession('s', QUESTIONS, 100);

    useExamSessionStore.getState().nextQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(1);

    useExamSessionStore.getState().nextQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(2);

    // Should not go past last question
    useExamSessionStore.getState().nextQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(2);
  });

  it('previousQuestion decrements and stops at 0', () => {
    useExamSessionStore.getState().setSession('s', QUESTIONS, 100);
    useExamSessionStore.getState().goToQuestion(2);

    useExamSessionStore.getState().previousQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(1);

    useExamSessionStore.getState().previousQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(0);

    // Should not go below 0
    useExamSessionStore.getState().previousQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(0);
  });

  it('decrementTime reduces by 1 and clamps at 0', () => {
    useExamSessionStore.setState({ timeRemaining: 2 });

    useExamSessionStore.getState().decrementTime();
    expect(useExamSessionStore.getState().timeRemaining).toBe(1);

    useExamSessionStore.getState().decrementTime();
    expect(useExamSessionStore.getState().timeRemaining).toBe(0);

    // Should not go negative
    useExamSessionStore.getState().decrementTime();
    expect(useExamSessionStore.getState().timeRemaining).toBe(0);
  });

  it('reset clears all state to initial values', () => {
    useExamSessionStore.getState().setSession('s', QUESTIONS, 3600);
    useExamSessionStore.getState().setAnswer('item-1', ['a']);
    useExamSessionStore.getState().toggleFlag('item-2');

    useExamSessionStore.getState().reset();
    const s = useExamSessionStore.getState();

    expect(s.sessionId).toBeNull();
    expect(s.questions).toHaveLength(0);
    expect(s.currentIndex).toBe(0);
    expect(Object.keys(s.answers)).toHaveLength(0);
    expect(s.flagged.size).toBe(0);
    expect(s.timeRemaining).toBe(0);
    expect(s.isSubmitting).toBe(false);
  });
});
