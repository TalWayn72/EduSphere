import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { AdminNotificationAnalyticsPage } from './AdminNotificationAnalyticsPage';

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
  return { ...actual, useQuery: vi.fn() };
});

const MOCK_ANALYTICS = {
  totalSent: 1500,
  totalDelivered: 1200,
  totalFailed: 50,
  byChannel: [
    { channel: 'email', sent: 500, delivered: 480, failed: 20 },
    { channel: 'push', sent: 1000, delivered: 720, failed: 30 },
  ],
  byType: [
    {
      notificationType: 'COURSE_ENROLLED',
      sent: 300,
      delivered: 290,
      failed: 10,
    },
    { notificationType: 'BADGE_ISSUED', sent: 200, delivered: 195, failed: 5 },
  ],
};

function setup(data = MOCK_ANALYTICS, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: data ? { notificationDeliveryAnalytics: data } : undefined,
      fetching,
      stale: false,
      error: undefined,
    },
    vi.fn(),
  ] as never);
}

describe('AdminNotificationAnalyticsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page title', () => {
    setup();
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByText('Notification Analytics')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setup(null as never, true);
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders date range inputs', () => {
    setup();
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('renders summary stat cards', () => {
    setup();
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByTestId('stat-total-sent')).toHaveTextContent('1,500');
    expect(screen.getByTestId('stat-total-delivered')).toHaveTextContent(
      '1,200'
    );
    expect(screen.getByTestId('stat-total-failed')).toHaveTextContent('50');
  });

  it('renders by channel table', () => {
    setup();
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByText('By Channel')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('push')).toBeInTheDocument();
  });

  it('renders by notification type table', () => {
    setup();
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByText('By Notification Type')).toBeInTheDocument();
    expect(screen.getByText('COURSE_ENROLLED')).toBeInTheDocument();
    expect(screen.getByText('BADGE_ISSUED')).toBeInTheDocument();
  });

  it('shows no data message when analytics is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        stale: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AdminNotificationAnalyticsPage />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('allows changing date range', () => {
    setup();
    render(<AdminNotificationAnalyticsPage />);
    const startInput = screen.getByLabelText('Start Date');
    fireEvent.change(startInput, { target: { value: '2026-01-01' } });
    expect(startInput).toHaveValue('2026-01-01');
  });
});
