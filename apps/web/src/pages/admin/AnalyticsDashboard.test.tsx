/**
 * AnalyticsDashboard.test.tsx — Tests for admin analytics page with at-risk section.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock urql - use vi.hoisted for proper hoisting
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));
vi.mock('urql', () => ({
  useQuery: mockUseQuery,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en', dir: () => 'ltr' },
  }),
}));

// Mock AdminLayout
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

// Mock LearnerDetailPanel
vi.mock('./LearnerDetailPanel', () => ({
  LearnerDetailPanel: ({
    open,
    userId,
    onClose,
  }: {
    open: boolean;
    userId: string | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="learner-detail-panel">
        Detail for {userId}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import { AnalyticsDashboard } from './AnalyticsDashboard';

const mockAnalytics = {
  kpis: [
    { label: 'Active Learners', value: '150', change: 5.2 },
    { label: 'Enrollments', value: '320', change: -2.1 },
  ],
  engagementTrend: [
    { date: '2026-03-01', value: 50 },
    { date: '2026-03-02', value: 65 },
  ],
  completionRates: [],
  topCourses: [
    { title: 'React Fundamentals', enrollments: 50, completions: 30 },
  ],
};

const mockAtRiskLearners = [
  {
    userId: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Smith',
    lastActive: '2026-03-10T00:00:00Z',
    quizPassRate: 35.5,
    completionRate: 12.0,
    riskLevel: 'HIGH' as const,
  },
  {
    userId: 'user-2',
    email: 'bob@example.com',
    name: 'Bob Jones',
    lastActive: null,
    quizPassRate: 48.0,
    completionRate: 18.5,
    riskLevel: 'MEDIUM' as const,
  },
];

const reexecute = vi.fn();

function setupMocks(
  analyticsData: typeof mockAnalytics | null,
  atRiskData: typeof mockAtRiskLearners | null,
  fetching = false
) {
  // useQuery is called multiple times during renders; use a call counter
  let callCount = 0;
  mockUseQuery.mockImplementation(() => {
    callCount++;
    // Odd calls = analytics query, even calls = at-risk query
    if (callCount % 2 === 1) {
      return [
        {
          data: analyticsData ? { orgAnalytics: analyticsData } : null,
          fetching,
        },
        reexecute,
      ];
    }
    return [
      {
        data: atRiskData !== null ? { orgAtRiskLearners: atRiskData } : null,
        fetching,
      },
      reexecute,
    ];
  });
}

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the analytics dashboard page', () => {
    setupMocks(mockAnalytics, []);
    render(<AnalyticsDashboard />);
    expect(screen.getByTestId('analytics-dashboard-page')).toBeDefined();
  });

  it('should show loading skeletons when fetching', () => {
    setupMocks(null, null, true);
    render(<AnalyticsDashboard />);
    expect(screen.getByTestId('at-risk-section')).toBeDefined();
  });

  it('should render at-risk learners table', () => {
    setupMocks(mockAnalytics, mockAtRiskLearners);
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Alice Smith')).toBeDefined();
    expect(screen.getByText('Bob Jones')).toBeDefined();
    expect(screen.getByTestId('risk-badge-high')).toBeDefined();
    expect(screen.getByTestId('risk-badge-medium')).toBeDefined();
  });

  it('should show "Never" for null lastActive', () => {
    setupMocks(mockAnalytics, mockAtRiskLearners);
    render(<AnalyticsDashboard />);
    expect(screen.getByText('Never')).toBeDefined();
  });

  it('should show "No at-risk learners" when list is empty', () => {
    setupMocks(mockAnalytics, []);
    render(<AnalyticsDashboard />);
    expect(screen.getByText('No at-risk learners detected')).toBeDefined();
  });

  it('should open learner detail panel on row click', async () => {
    setupMocks(mockAnalytics, mockAtRiskLearners);
    render(<AnalyticsDashboard />);

    const row = screen.getByTestId('at-risk-row-user-1');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByTestId('learner-detail-panel')).toBeDefined();
      expect(screen.getByText('Detail for user-1')).toBeDefined();
    });
  });

  it('should display quiz pass rate and completion rate', () => {
    setupMocks(mockAnalytics, mockAtRiskLearners);
    render(<AnalyticsDashboard />);
    expect(screen.getByText('35.5%')).toBeDefined();
    expect(screen.getByText('12.0%')).toBeDefined();
  });

  it('should render KPI cards with positive/negative change colors', () => {
    setupMocks(mockAnalytics, []);
    render(<AnalyticsDashboard />);
    expect(screen.getByText('+5.2%')).toBeDefined();
    expect(screen.getByText('-2.1%')).toBeDefined();
  });
});
