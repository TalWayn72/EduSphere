/**
 * ExamStartPage component tests
 *
 * Verifies:
 *  1.  Renders blueprint title and description
 *  2.  Start button disabled until checkbox checked
 *  3.  Shows time limit and question count
 *  4.  Shows loading state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ blueprintId: 'bp-1' }),
  useNavigate: () => mockNavigate,
}));

const mockStartSession = vi.fn();
vi.mock('@/hooks/useExamSession', () => ({
  useExamBlueprint: vi.fn(() => ({
    blueprint: {
      id: 'bp-1',
      title: 'Midterm Certification',
      description: 'Assess core competencies',
      totalQuestions: 50,
      timeLimitMinutes: 90,
      passingScore: 70,
      passingMethod: 'PERCENTAGE',
    },
    loading: false,
  })),
  useStartExamSession: vi.fn(() => ({
    startSession: mockStartSession,
    loading: false,
    error: null,
  })),
}));

vi.mock('@/stores/exam-session.store', () => ({
  useExamSessionStore: vi.fn((sel: (s: Record<string, unknown>) => unknown) =>
    sel({ setSession: vi.fn() }),
  ),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { ExamStartPage } from './ExamStartPage';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ExamStartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders blueprint title', () => {
    render(<ExamStartPage />);
    expect(screen.getByText('Midterm Certification')).toBeInTheDocument();
  });

  it('renders blueprint description', () => {
    render(<ExamStartPage />);
    expect(screen.getByText('Assess core competencies')).toBeInTheDocument();
  });

  it('shows question count badge', () => {
    render(<ExamStartPage />);
    expect(screen.getByText('50 questions')).toBeInTheDocument();
  });

  it('shows time limit badge', () => {
    render(<ExamStartPage />);
    expect(screen.getByText('90 minutes')).toBeInTheDocument();
  });

  it('shows passing threshold badge', () => {
    render(<ExamStartPage />);
    expect(screen.getByText(/passing: 70%/i)).toBeInTheDocument();
  });

  it('Start button is disabled until checkbox is checked', () => {
    render(<ExamStartPage />);
    const startBtn = screen.getByRole('button', { name: /start exam/i });
    expect(startBtn).toBeDisabled();

    // Check the agreement checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(startBtn).not.toBeDisabled();
  });

  it('shows exam instructions', () => {
    render(<ExamStartPage />);
    expect(screen.getByText(/do not navigate away/i)).toBeInTheDocument();
    expect(screen.getByText(/timer is enforced/i)).toBeInTheDocument();
  });
});
