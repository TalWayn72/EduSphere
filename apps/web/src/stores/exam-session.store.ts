import { create } from 'zustand';
import type { QuizItem } from '@/types/quiz';

export interface ExamQuestion {
  itemId: string;
  questionData: QuizItem;
  domain: string;
  bloomLevel: string;
}

interface ExamSessionStore {
  sessionId: string | null;
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<string, unknown>;
  flagged: Set<string>;
  timeRemaining: number;
  isSubmitting: boolean;

  setSession(
    sessionId: string,
    questions: ExamQuestion[],
    timeRemaining: number,
  ): void;
  setAnswer(itemId: string, answer: unknown): void;
  toggleFlag(itemId: string): void;
  goToQuestion(index: number): void;
  nextQuestion(): void;
  previousQuestion(): void;
  decrementTime(): void;
  setSubmitting(value: boolean): void;
  reset(): void;
}

export const useExamSessionStore = create<ExamSessionStore>()((set, get) => ({
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  flagged: new Set<string>(),
  timeRemaining: 0,
  isSubmitting: false,

  setSession: (sessionId, questions, timeRemaining) =>
    set({
      sessionId,
      questions,
      timeRemaining,
      currentIndex: 0,
      answers: {},
      flagged: new Set(),
      isSubmitting: false,
    }),

  setAnswer: (itemId, answer) =>
    set((state) => ({ answers: { ...state.answers, [itemId]: answer } })),

  toggleFlag: (itemId) =>
    set((state) => {
      const next = new Set(state.flagged);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { flagged: next };
    }),

  goToQuestion: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) set({ currentIndex: index });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1)
      set({ currentIndex: currentIndex + 1 });
  },

  previousQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  decrementTime: () =>
    set((state) => ({
      timeRemaining: Math.max(0, state.timeRemaining - 1),
    })),

  setSubmitting: (value) => set({ isSubmitting: value }),

  reset: () =>
    set({
      sessionId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      flagged: new Set(),
      timeRemaining: 0,
      isSubmitting: false,
    }),
}));
