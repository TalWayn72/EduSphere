import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('./StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('./helpers', () => ({
  formatRelativeTime: () => 'in 2 hours',
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <div data-testid="session-card" onClick={props.onClick as () => void}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
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
  Calendar: () => <span>cal</span>,
  Users: () => <span>users</span>,
  Loader2: () => <span>loader</span>,
  StopCircle: () => <span>stop</span>,
  XCircle: () => <span>x</span>,
  PlayCircle: () => <span>play</span>,
}));

import { SessionCard } from './SessionCard';

const session = {
  id: 's-1',
  meetingName: 'Live Math Session',
  status: 'SCHEDULED' as const,
  scheduledAt: '2026-03-25T10:00:00Z',
  participantCount: 15,
  maxParticipants: null,
  courseId: null,
};

const baseProps = {
  session,
  isInstructor: false,
  onJoin: vi.fn(),
  onStart: vi.fn(),
  onEnd: vi.fn(),
  onCancel: vi.fn(),
  onOpen: vi.fn(),
  joinFetching: false,
  startFetching: false,
  endFetching: false,
  cancelFetching: false,
};

describe('SessionCard', () => {
  it('renders session title', () => {
    render(<SessionCard {...baseProps} />);
    expect(screen.getByText('Live Math Session')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<SessionCard {...baseProps} />);
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<SessionCard {...baseProps} />);
    expect(container).toBeTruthy();
  });
});
