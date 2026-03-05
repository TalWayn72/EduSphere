import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks (must be hoisted before imports) ────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn().mockResolvedValue({ error: null })]),
  useSubscription: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'u-1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    tenantId: 't-1',
    role: 'STUDENT',
    scopes: ['read'],
  })),
  DEV_MODE: true,
  logout: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    resolvedMode: 'light',
    setThemeMode: vi.fn(),
    tenantPrimitives: {},
    userPreferences: { mode: 'system', fontSize: 'md', readingMode: false, motionPreference: 'full', contrastMode: 'normal' },
    setTenantTheme: vi.fn(),
    setFontSize: vi.fn(),
    setReadingMode: vi.fn(),
    setMotionPreference: vi.fn(),
    previewThemeChanges: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar" />,
}));

import { DashboardPage } from './DashboardPage';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout wrapper', () => {
    renderDashboard();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders welcome section with user name', () => {
    renderDashboard();
    expect(screen.getByTestId('welcome-heading')).toBeInTheDocument();
    expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
  });

  it('renders streak widget with day count', () => {
    renderDashboard();
    const widget = screen.getByTestId('streak-widget');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveTextContent('7 day streak');
  });

  it('renders in-progress courses count quick stat', () => {
    renderDashboard();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('renders completed courses quick stat', () => {
    renderDashboard();
    // Use getAllByText because "completed" appears in both the quick stat and activity feed
    const matches = screen.getAllByText(/completed/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders total XP quick stat', () => {
    renderDashboard();
    // Use getAllByText because "XP" appears in both the quick stat and the activity feed text (case-insensitive)
    const matches = screen.getAllByText(/XP/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders continue learning section', () => {
    renderDashboard();
    expect(screen.getByTestId('continue-learning-section')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /continue learning/i })).toBeInTheDocument();
  });

  it('renders at least one course card with progress', () => {
    renderDashboard();
    expect(screen.getByText('Introduction to Talmud Study')).toBeInTheDocument();
    expect(screen.getByText('Advanced Chavruta Techniques')).toBeInTheDocument();
  });

  it('renders See All link in continue learning section', () => {
    renderDashboard();
    expect(screen.getByRole('link', { name: /see all/i })).toBeInTheDocument();
  });

  it('renders mastery overview section', () => {
    renderDashboard();
    expect(screen.getByTestId('mastery-overview')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mastery overview/i })).toBeInTheDocument();
  });

  it('renders MasteryBadge components for each topic', () => {
    renderDashboard();
    expect(screen.getByTestId('mastery-badge-mastered')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-proficient')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-familiar')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-attempted')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-none')).toBeInTheDocument();
  });

  it('renders recent activity section', () => {
    renderDashboard();
    expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recent activity/i })).toBeInTheDocument();
  });

  it('renders 5 recent activity items', () => {
    renderDashboard();
    const activityList = screen.getByRole('list', { name: /recent learning activities/i });
    expect(activityList.querySelectorAll('li')).toHaveLength(5);
  });

  it('renders recommendations section', () => {
    renderDashboard();
    expect(screen.getByTestId('recommendations')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recommended for you/i })).toBeInTheDocument();
  });

  it('renders recommended course cards', () => {
    renderDashboard();
    expect(screen.getByText("Mishnah: Laws of Damages")).toBeInTheDocument();
    expect(screen.getByText('Biblical Hebrew Foundations')).toBeInTheDocument();
  });

  it('does not display raw technical error strings', () => {
    renderDashboard();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/undefined/);
    expect(body).not.toMatch(/null/);
    expect(body).not.toMatch(/\[object/);
  });
});
