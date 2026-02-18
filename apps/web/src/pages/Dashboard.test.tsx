import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock urql — keep gql/other exports, only override useQuery
vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
  };
});

// Mock Layout to avoid nested routing/auth concerns
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock AIChatPanel (streaming AI — too complex for unit tests)
vi.mock('@/components/AIChatPanel', () => ({
  AIChatPanel: () => <div data-testid="ai-chat-panel" />,
}));

// Mock auth so getCurrentUser doesn't try Keycloak
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
}));

import { Dashboard } from './Dashboard';
import { useQuery } from 'urql';
import {
  MOCK_LEARNING_STREAK,
  MOCK_CONCEPTS_MASTERED,
} from '@/lib/mock-analytics';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
  });

  it('renders Dashboard heading', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders "Welcome back" greeting', () => {
    renderDashboard();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('renders Active Courses stat card', () => {
    renderDashboard();
    expect(screen.getByText('Active Courses')).toBeInTheDocument();
  });

  it('renders Learning Streak stat card with mock value', () => {
    renderDashboard();
    expect(screen.getByText('Learning Streak')).toBeInTheDocument();
    expect(
      screen.getByText(`${MOCK_LEARNING_STREAK} days`)
    ).toBeInTheDocument();
  });

  it('renders Study Time stat card', () => {
    renderDashboard();
    expect(screen.getByText('Study Time')).toBeInTheDocument();
  });

  it('renders Concepts Mastered stat card with mock value', () => {
    renderDashboard();
    expect(screen.getByText('Concepts Mastered')).toBeInTheDocument();
    expect(screen.getByText(String(MOCK_CONCEPTS_MASTERED))).toBeInTheDocument();
  });

  it('renders Study Groups secondary card', () => {
    renderDashboard();
    expect(screen.getByText('Study Groups')).toBeInTheDocument();
  });

  it('renders Annotations secondary card', () => {
    renderDashboard();
    expect(screen.getAllByText('Annotations').length).toBeGreaterThanOrEqual(1);
  });

  it('renders AI Sessions secondary card', () => {
    renderDashboard();
    expect(screen.getByText('AI Sessions')).toBeInTheDocument();
  });

  it('renders Study Activity section', () => {
    renderDashboard();
    expect(screen.getByText('Study Activity')).toBeInTheDocument();
  });

  it('renders Recent Activity section', () => {
    renderDashboard();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders AIChatPanel', () => {
    renderDashboard();
    expect(screen.getByTestId('ai-chat-panel')).toBeInTheDocument();
  });

  it('renders layout wrapper', () => {
    renderDashboard();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('in DEV_MODE, bypasses fetching state and shows mock data', () => {
    // When VITE_DEV_MODE=true (set in apps/web/.env), Dashboard always shows mock data
    // regardless of the GraphQL query state — so no "..." loading placeholder appears.
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderDashboard();
    // DEV_MODE: mock user is shown, no loading state
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('in DEV_MODE, ignores API errors and shows mock data', () => {
    // When VITE_DEV_MODE=true, errors from GraphQL are swallowed and mock data is used.
    vi.mocked(useQuery)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: new Error('Network error') as never },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);
    renderDashboard();
    // DEV_MODE: mock user "Dev" is shown, not an error card
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.queryByText(/error loading user data/i)).not.toBeInTheDocument();
  });
});
