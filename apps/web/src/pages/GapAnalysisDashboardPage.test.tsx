import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GapAnalysisDashboardPage } from './GapAnalysisDashboardPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="admin-layout">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
    useQuery: vi.fn(() => [{ fetching: false, data: null }, vi.fn()]),
  };
});

import { useAuthRole } from '@/hooks/useAuthRole';

function renderPage() {
  return render(
    <MemoryRouter>
      <GapAnalysisDashboardPage />
    </MemoryRouter>
  );
}

describe('GapAnalysisDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    mockNavigate.mockClear();
  });

  it('shows access-denied for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('shows access-denied for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('renders gap-analysis-page for ORG_ADMIN', () => {
    renderPage();
    expect(screen.getByTestId('gap-analysis-page')).toBeInTheDocument();
  });

  it('renders gap-analysis-page for SUPER_ADMIN', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByTestId('gap-analysis-page')).toBeInTheDocument();
  });

  it('shows total-gaps-count', () => {
    renderPage();
    const el = screen.getByTestId('total-gaps-count');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toBe('3');
  });

  it('shows critical-gaps-table', () => {
    renderPage();
    expect(screen.getByTestId('critical-gaps-table')).toBeInTheDocument();
  });

  it('shows gap-summary-card', () => {
    renderPage();
    expect(screen.getByTestId('gap-summary-card')).toBeInTheDocument();
  });

  it('shows export button', () => {
    renderPage();
    expect(screen.getByTestId('export-gap-report-btn')).toBeInTheDocument();
  });

  it('shows recommended actions in the table', () => {
    renderPage();
    expect(screen.getByText(/GraphRAG Fundamentals/)).toBeInTheDocument();
    expect(screen.getByText(/workshop session/)).toBeInTheDocument();
  });

  it('renders severity badges', () => {
    renderPage();
    const highBadges = screen.getAllByText('HIGH');
    expect(highBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });
});
