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

const MOCK_PROFILES = [
  { id: 'role-1', roleName: 'Data Scientist', description: null, requiredConceptsCount: 5 },
];

const MOCK_REPORT = {
  roleId: 'role-1',
  roleName: 'Data Scientist',
  totalRequired: 5,
  mastered: 2,
  gapCount: 3,
  completionPercentage: 40,
  gaps: [
    { conceptName: 'Advanced GraphRAG', isMastered: false, recommendedContentItems: ['c1'], recommendedContentTitles: ['GraphRAG Fundamentals'], relevanceScore: 0.9 },
    { conceptName: 'Knowledge Graph Design', isMastered: false, recommendedContentItems: ['c2'], recommendedContentTitles: ['Workshop session'], relevanceScore: 0.6 },
    { conceptName: 'Vector Embeddings', isMastered: false, recommendedContentItems: ['c3'], recommendedContentTitles: ['Linear Algebra prerequisite'], relevanceScore: 0.95 },
  ],
};

// Use call-count based approach: first call = skillProfiles, second call = skillGapAnalysis
let queryCallCount = 0;
vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
    useQuery: vi.fn(() => {
      queryCallCount++;
      if (queryCallCount % 2 === 1) {
        return [{ fetching: false, data: { skillProfiles: MOCK_PROFILES } }, vi.fn()];
      }
      return [{ fetching: false, data: { skillGapAnalysis: MOCK_REPORT } }, vi.fn()];
    }),
  };
});

import { useAuthRole } from '@/hooks/useAuthRole';

function renderPage() {
  queryCallCount = 0;
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
    queryCallCount = 0;
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

  it('shows recommended content titles in the table', () => {
    renderPage();
    expect(screen.getByText(/GraphRAG Fundamentals/)).toBeInTheDocument();
  });

  it('renders relevance badges', () => {
    renderPage();
    // 90% and 95% relevance => red badges, 60% => yellow badge
    const badges = screen.getAllByText(/%/);
    expect(badges.length).toBeGreaterThan(0);
  });
});
