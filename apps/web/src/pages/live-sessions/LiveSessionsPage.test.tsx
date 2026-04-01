import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'INSTRUCTOR' }),
  DEV_MODE: true,
}));

vi.mock('@/hooks/useLiveSessionActions', () => ({
  useLiveSessionActions: () => ({
    joinSession: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    cancelSession: vi.fn(),
    joinFetching: false,
    startFetching: false,
    endFetching: false,
    cancelFetching: false,
  }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  Video: () => <span>video</span>,
  Plus: () => <span>plus</span>,
  Radio: () => <span>radio</span>,
}));

vi.mock('./SessionCard', () => ({
  SessionCard: () => <div data-testid="session-card" />,
}));

vi.mock('./SkeletonCard', () => ({
  SkeletonCard: () => <div data-testid="skeleton" />,
}));

vi.mock('./CreateSessionModal', () => ({
  CreateSessionModal: () => null,
}));

import { LiveSessionsPage } from './LiveSessionsPage';

describe('LiveSessionsPage', () => {
  it('renders inside Layout', () => {
    render(
      <MemoryRouter>
        <LiveSessionsPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(
      <MemoryRouter>
        <LiveSessionsPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
