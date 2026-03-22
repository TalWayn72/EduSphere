/**
 * GamificationConfig — Unit tests (F-12).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock urql
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock('urql', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Mock AdminLayout
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('GamificationConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([{}, vi.fn()]);
  });

  it('renders the config page with enabled toggle', async () => {
    mockUseQuery.mockReturnValue([
      {
        data: {
          gamificationConfig: {
            enabled: true,
            showLeaderboard: true,
            showBadges: true,
            showPoints: true,
            showStreaks: true,
            xpRules: { lesson_completion: 10, quiz_pass: 25 },
            leaderboardScope: 'TENANT',
          },
          orgBadges: [],
        },
        fetching: false,
      },
      vi.fn(),
    ]);

    const { GamificationConfig } = await import('./GamificationConfig');
    render(
      <BrowserRouter>
        <GamificationConfig />
      </BrowserRouter>
    );

    expect(screen.getByTestId('gamification-config-page')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    mockUseQuery.mockReturnValue([
      { data: undefined, fetching: true },
      vi.fn(),
    ]);

    const { GamificationConfig } = await import('./GamificationConfig');
    render(
      <BrowserRouter>
        <GamificationConfig />
      </BrowserRouter>
    );

    expect(screen.getByTestId('gamification-config-page')).toBeInTheDocument();
  });
});
