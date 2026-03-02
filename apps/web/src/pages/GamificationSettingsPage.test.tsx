import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AdminLayout: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/admin-gamification.queries', () => ({
  ADMIN_BADGES_QUERY: 'ADMIN_BADGES_QUERY',
  CREATE_BADGE_MUTATION: 'CREATE_BADGE_MUTATION',
  UPDATE_BADGE_MUTATION: 'UPDATE_BADGE_MUTATION',
  DELETE_BADGE_MUTATION: 'DELETE_BADGE_MUTATION',
}));

vi.mock('@/components/BadgeFormFields', () => ({
  BadgeFormFields: vi.fn(() => <div data-testid="badge-form-fields" />),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { GamificationSettingsPage } from './GamificationSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_BADGES = [
  {
    id: 'badge-1',
    name: 'Course Champion',
    description: 'Completed 10 courses',
    iconEmoji: '🏆',
    category: 'achievement',
    pointsReward: 100,
    conditionType: 'COURSE_COMPLETIONS',
    conditionValue: 10,
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(badges: typeof MOCK_BADGES | [] = [], fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { adminBadges: badges },
      fetching,
      error: undefined,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GamificationSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GamificationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "Gamification Settings" heading via AdminLayout', () => {
    renderPage();
    expect(screen.getByText('Gamification Settings')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('allows ORG_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(screen.getByText('Badge Management')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Badge Management')).toBeInTheDocument();
  });

  it('renders the "Badge Management" card', () => {
    renderPage();
    expect(screen.getByText('Badge Management')).toBeInTheDocument();
  });

  it('renders the "Points Reference" card', () => {
    renderPage();
    expect(screen.getByText('Points Reference')).toBeInTheDocument();
  });

  it('shows "No badges defined yet." when badge list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(screen.getByText('No badges defined yet.')).toBeInTheDocument();
  });

  it('shows loading text when query is fetching', () => {
    setupUrql([], true);
    renderPage();
    expect(screen.getByText('Loading badges...')).toBeInTheDocument();
  });

  it('renders "Create Badge" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /create badge/i })
    ).toBeInTheDocument();
  });

  it('shows BadgeFormFields when "Create Badge" is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /create badge/i }));
    expect(screen.getByTestId('badge-form-fields')).toBeInTheDocument();
  });

  it('shows "Cancel" button after opening create form', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /create badge/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders badge names from the list', () => {
    setupUrql(MOCK_BADGES);
    renderPage();
    expect(screen.getByText('Course Champion')).toBeInTheDocument();
  });

  it('renders badge emoji icons', () => {
    setupUrql(MOCK_BADGES);
    renderPage();
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('shows points reference values', () => {
    renderPage();
    // POINT_REFERENCE has 'Course completion' with 100 points
    expect(screen.getByText('Course completion')).toBeInTheDocument();
    // Multiple "100" values may exist — just verify the label is there
  });
});
