import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ sessionId: 's-1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('lucide-react', () => ({
  Loader2: () => <span>loader</span>,
}));

vi.mock('@/components/exam/ExamPlayer', () => ({
  ExamPlayer: () => <div data-testid="exam-player" />,
}));

vi.mock('@/stores/exam-session.store', () => ({
  useExamSessionStore: () => ({
    sessionId: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    submitting: false,
    setSession: vi.fn(),
    answerQuestion: vi.fn(),
    nextQuestion: vi.fn(),
    prevQuestion: vi.fn(),
    setSubmitting: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/hooks/useExamSession', () => ({
  useExamSession: () => ({ session: null, loading: true }),
  useSubmitExam: () => ({ submitExam: vi.fn(), loading: false }),
}));

import { ExamTakingPage } from './ExamTakingPage';

describe('ExamTakingPage', () => {
  it('renders without crash', () => {
    const { container } = render(
      <MemoryRouter>
        <ExamTakingPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
