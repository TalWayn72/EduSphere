import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    {
      data: {
        myTeamOverview: {
          memberCount: 3,
          avgCompletionPct: 67.5,
          avgXpThisWeek: 45,
          atRiskCount: 1,
          topCourseTitle: 'Introduction to Torah',
        },
        myTeamMemberProgress: [
          {
            userId: 'u1',
            displayName: 'Alice Cohen',
            coursesEnrolled: 2,
            avgCompletionPct: 80,
            totalXp: 300,
            level: 2,
            lastActiveAt: new Date().toISOString(),
            isAtRisk: false,
          },
          {
            userId: 'u2',
            displayName: 'Bob Levi',
            coursesEnrolled: 1,
            avgCompletionPct: 15,
            totalXp: 50,
            level: 1,
            lastActiveAt: null,
            isAtRisk: true,
          },
        ],
      },
      fetching: false,
    },
  ]),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => 'MANAGER',
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} aria-busy="true" />,
}));

vi.mock('@/lib/graphql/manager.queries', () => ({
  MY_TEAM_OVERVIEW_QUERY: 'MOCK_QUERY',
}));

vi.mock('lucide-react', () => ({
  Users: () => <span>UsersIcon</span>,
  TrendingUp: () => <span>TrendingUpIcon</span>,
  AlertTriangle: () => <span>AlertTriangleIcon</span>,
  Star: () => <span>StarIcon</span>,
}));

import { ManagerDashboardPage } from './ManagerDashboardPage';

describe('ManagerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Manager Dashboard heading', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Manager Dashboard')).toBeDefined();
  });

  it('renders active member name in table', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Alice Cohen')).toBeDefined();
  });

  it('renders at-risk member name', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Bob Levi')).toBeDefined();
  });

  it('shows At Risk badge for at-risk member', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('At Risk')).toBeDefined();
  });

  it('does not show At Risk badge for active member', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    const atRiskBadges = screen.queryAllByText('At Risk');
    // Only Bob Levi is at risk, Alice is not
    expect(atRiskBadges).toHaveLength(1);
  });

  it('renders stat card labels', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    // Some labels appear in both stat cards and table headers — use textContent check
    expect(document.body.textContent).toContain('Team Members');
    expect(document.body.textContent).toContain('Avg Completion');
    expect(document.body.textContent).toContain('At-Risk Learners');
    expect(document.body.textContent).toContain('Avg XP This Week');
  });

  it('does not show raw technical error strings', () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    expect(document.body.textContent).not.toContain('[GraphQL]');
    expect(document.body.textContent).not.toContain('Network error');
    expect(document.body.textContent).not.toContain('undefined');
  });
});
