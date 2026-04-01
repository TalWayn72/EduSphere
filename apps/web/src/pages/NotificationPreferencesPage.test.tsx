import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { NotificationPreferencesPage } from './NotificationPreferencesPage';

vi.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === '__esModule') return true;
          return function MockIcon(props: Record<string, unknown>) {
            return <span data-testid={`icon-${String(name)}`} {...props} />;
          };
        },
      }
    )
);

vi.mock('urql', async () => {
  const actual = await vi.importActual('urql');
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

const MOCK_PREFS = [
  { notificationType: 'COURSE_ENROLLED', channel: 'inApp', enabled: true },
  { notificationType: 'COURSE_ENROLLED', channel: 'email', enabled: false },
  { notificationType: 'BADGE_ISSUED', channel: 'whatsapp', enabled: true },
];

function setup(prefs = MOCK_PREFS, fetching = false) {
  const mutateFn = vi.fn().mockResolvedValue({ data: {} });
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { myNotificationPreferences: prefs },
      fetching,
      stale: false,
      error: undefined,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false, stale: false, error: undefined },
    mutateFn,
  ] as never);
  return { mutateFn };
}

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page title', () => {
    setup();
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setup([], true);
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders category headings', () => {
    setup();
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Peer Review')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('renders channel column headers', () => {
    setup();
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('In-App')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('renders notification type labels', () => {
    setup();
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Course Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Badge Issued')).toBeInTheDocument();
    expect(screen.getByText('Streak Reminder')).toBeInTheDocument();
  });

  it('shows "Set up" link when whatsapp not configured', () => {
    setup([
      { notificationType: 'COURSE_ENROLLED', channel: 'inApp', enabled: true },
    ]);
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    const setupLinks = screen.getAllByText('Set up');
    expect(setupLinks.length).toBeGreaterThan(0);
    expect(setupLinks[0].closest('a')).toHaveAttribute(
      'href',
      '/settings/whatsapp'
    );
  });

  it('calls mutation when toggle is clicked', () => {
    const { mutateFn } = setup();
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(mutateFn).toHaveBeenCalled();
  });

  it('has accessible table role', () => {
    setup();
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('grid', { name: /notification preferences/i })
    ).toBeInTheDocument();
  });
});
