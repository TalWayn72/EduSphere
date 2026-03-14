import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoGradingResultsPage } from './AutoGradingResultsPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="admin-layout">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'INSTRUCTOR'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('submissionId=sub-1'), vi.fn()],
  };
});

const MOCK_RESULTS = [
  { questionId: 'q1', score: 8, maxScore: 10, explanation: 'Good coverage', suggestions: ['Add more examples'] },
  { questionId: 'q2', score: 5, maxScore: 10, explanation: 'Missing key terms', suggestions: ['Review chapter 3'] },
];

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
    useQuery: vi.fn(() => [{ fetching: false, data: { autoGradingResults: MOCK_RESULTS } }, vi.fn()]),
  };
});

import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

function renderPage() {
  return render(
    <MemoryRouter>
      <AutoGradingResultsPage />
    </MemoryRouter>
  );
}

describe('AutoGradingResultsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    mockNavigate.mockClear();
  });

  it('shows access-denied for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('navigates away for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders auto-grading-page for INSTRUCTOR', () => {
    renderPage();
    expect(screen.getByTestId('auto-grading-page')).toBeInTheDocument();
  });

  it('renders auto-grading-page for ORG_ADMIN', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(screen.getByTestId('auto-grading-page')).toBeInTheDocument();
  });

  it('shows overall-score-summary', () => {
    renderPage();
    expect(screen.getByTestId('overall-score-summary')).toBeInTheDocument();
  });

  it('shows individual result cards for q1 and q2', () => {
    renderPage();
    expect(screen.getByTestId('grading-result-q1')).toBeInTheDocument();
    expect(screen.getByTestId('grading-result-q2')).toBeInTheDocument();
  });

  it('shows privacy notice', () => {
    renderPage();
    expect(screen.getByTestId('privacy-notice')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-notice').textContent).toMatch(/Ollama/);
  });

  it('shows export button', () => {
    renderPage();
    expect(screen.getByTestId('export-grading-btn')).toBeInTheDocument();
  });

  it('applies green color class for q1 (80%)', () => {
    renderPage();
    const card = screen.getByTestId('grading-result-q1');
    expect(card.className).toMatch(/green/);
  });

  it('applies red color class for q2 (50%)', () => {
    renderPage();
    const card = screen.getByTestId('grading-result-q2');
    expect(card.className).toMatch(/red/);
  });

  it('does not crash when SUPER_ADMIN views the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByTestId('auto-grading-page')).toBeInTheDocument();
  });

  it('shows empty state when no results returned', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: { autoGradingResults: [] } },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: null },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('grading-skeleton')).toBeInTheDocument();
  });
});
