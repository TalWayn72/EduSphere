import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_COURSES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Introduction to TypeScript',
    courseAnalytics: {
      courseId: '00000000-0000-0000-0000-000000000001',
      enrollmentCount: 42,
      completionRate: 68,
      avgQuizScore: 81,
      activeLearnersLast7Days: 12,
      dropOffFunnel: [
        { moduleId: 'm1', moduleName: 'Basics', learnersStarted: 40, learnersCompleted: 38, dropOffRate: 5 },
        { moduleId: 'm2', moduleName: 'Advanced', learnersStarted: 38, learnersCompleted: 20, dropOffRate: 47 },
      ],
    },
  },
];

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [{ data: { myCourses: MOCK_COURSES }, fetching: false }]),
}));

vi.mock('@/lib/graphql/analytics.queries', () => ({
  INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY: 'INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY',
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  AT_RISK_LEARNERS_QUERY: 'AT_RISK_LEARNERS_QUERY',
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'INSTRUCTOR'),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'layout' }, children),
}));

vi.mock('@/components/analytics/DropOffFunnelChart', () => ({
  DropOffFunnelChart: ({ data }: { data: { moduleName: string; dropOffRate: number }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'drop-off-chart' },
      data.length ? `${data.length} modules` : 'No funnel data available.'
    ),
}));

vi.mock('@/components/analytics/AtRiskLearnersPanel', () => ({
  AtRiskLearnersPanel: ({ courseId }: { courseId: string }) =>
    React.createElement('div', { 'data-testid': 'at-risk-panel', 'data-course-id': courseId }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'card' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h3', {}, children),
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => React.createElement('span', { 'data-testid': 'alert-circle' }),
  Users: () => React.createElement('span', { 'data-testid': 'users-icon' }),
  TrendingUp: () => React.createElement('span', { 'data-testid': 'trending-icon' }),
  Star: () => React.createElement('span', { 'data-testid': 'star-icon' }),
  Activity: () => React.createElement('span', { 'data-testid': 'activity-icon' }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { InstructorAnalyticsDashboard } from './InstructorAnalyticsDashboard';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

function renderPage() {
  return render(
    <MemoryRouter>
      <InstructorAnalyticsDashboard />
    </MemoryRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('InstructorAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCourses: MOCK_COURSES }, fetching: false },
    ] as ReturnType<typeof urql.useQuery>);
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Instructor Analytics')).toBeDefined();
  });

  it('shows stat card labels for enrollments and completion rate', () => {
    renderPage();
    expect(screen.getByText('Total Enrollments')).toBeDefined();
    expect(screen.getByText('Avg Completion Rate')).toBeDefined();
  });

  it('shows stat card labels for quiz score and at-risk', () => {
    renderPage();
    expect(screen.getByText('Avg Quiz Score')).toBeDefined();
    expect(screen.getByText('At-Risk Courses')).toBeDefined();
  });

  it('shows total enrollment count aggregated from all courses', () => {
    renderPage();
    // MOCK_COURSES has one course with 42 enrollments
    expect(document.body.textContent).toContain('42');
  });

  it('renders course title in Overview tab', () => {
    renderPage();
    expect(screen.getByText('Introduction to TypeScript')).toBeDefined();
  });

  it('renders tab navigation buttons', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    const tabTexts = tabs.map((t) => t.textContent);
    expect(tabTexts).toContain('Overview');
    expect(tabTexts).toContain('Learner Engagement');
    expect(tabTexts).toContain('At-Risk Learners');
    expect(tabTexts).toContain('AI Usage');
  });

  it('shows DropOffFunnelChart when Learner Engagement tab is active', async () => {
    renderPage();
    const engagementTab = screen
      .getAllByRole('tab')
      .find((t) => t.textContent === 'Learner Engagement');
    expect(engagementTab).toBeDefined();
    act(() => { engagementTab!.click(); });
    expect(screen.getByTestId('drop-off-chart')).toBeDefined();
  });

  it('shows AtRiskLearnersPanel when At-Risk Learners tab is active', () => {
    renderPage();
    const atRiskTab = screen
      .getAllByRole('tab')
      .find((t) => t.textContent === 'At-Risk Learners');
    expect(atRiskTab).toBeDefined();
    act(() => { atRiskTab!.click(); });
    expect(screen.getByTestId('at-risk-panel')).toBeDefined();
  });

  it('shows "No at-risk learners" empty state when no courses', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCourses: [] }, fetching: false },
    ] as ReturnType<typeof urql.useQuery>);
    renderPage();
    const atRiskTab = screen
      .getAllByRole('tab')
      .find((t) => t.textContent === 'At-Risk Learners');
    act(() => { atRiskTab!.click(); });
    expect(document.body.textContent).toContain('No at-risk learners');
  });

  it('shows access denied when role is STUDENT', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.getByText(/Access denied/)).toBeDefined();
    expect(screen.getByTestId('alert-circle')).toBeDefined();
  });

  it('does NOT show raw GraphQL error text', () => {
    renderPage();
    expect(document.body.textContent).not.toContain('[GraphQL]');
    expect(document.body.textContent).not.toContain('Error:');
    expect(document.body.textContent).not.toContain('stack');
  });

  it('does NOT render access denied for ORG_ADMIN', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(document.body.textContent).not.toContain('Access denied');
  });
});
