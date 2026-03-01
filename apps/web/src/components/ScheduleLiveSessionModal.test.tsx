import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as urql from 'urql';
import { ScheduleLiveSessionModal } from './ScheduleLiveSessionModal';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/live-session.queries', () => ({
  CREATE_LIVE_SESSION_MUTATION: 'CREATE_LIVE_SESSION_MUTATION',
  SESSION_POLLS_QUERY: 'SESSION_POLLS_QUERY',
  CREATE_POLL_MUTATION: 'CREATE_POLL_MUTATION',
  ACTIVATE_POLL_MUTATION: 'ACTIVATE_POLL_MUTATION',
  CLOSE_POLL_MUTATION: 'CLOSE_POLL_MUTATION',
  VOTE_POLL_MUTATION: 'VOTE_POLL_MUTATION',
  POLL_UPDATED_SUBSCRIPTION: 'POLL_UPDATED_SUBSCRIPTION',
  POLL_RESULTS_QUERY: 'POLL_RESULTS_QUERY',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockCreateSession = vi.fn();

const defaultProps = {
  contentItemId: 'ci-1',
  open: true,
  onClose: vi.fn(),
  onCreated: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateSession.mockResolvedValue({ data: { createLiveSession: { id: 's1' } }, error: undefined });
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false } as never,
    mockCreateSession as never,
  ]);
});

describe('ScheduleLiveSessionModal', () => {
  it('renders dialog when open=true', () => {
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render dialog when open=false', () => {
    render(<ScheduleLiveSessionModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog title via translation key', () => {
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    expect(screen.getByText('liveSession.scheduleTitle')).toBeInTheDocument();
  });

  it('renders meeting name input', () => {
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    expect(screen.getByLabelText('liveSession.meetingName')).toBeInTheDocument();
  });

  it('renders scheduled date input', () => {
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    expect(screen.getByLabelText('liveSession.scheduledAt')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ScheduleLiveSessionModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /common:cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows validation error when form is submitted empty', async () => {
    const { container } = render(<ScheduleLiveSessionModal {...defaultProps} />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() =>
      expect(
        screen.getByText('liveSession.validationError')
      ).toBeInTheDocument()
    );
  });

  it('calls createSession with correct args on submit', async () => {
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('liveSession.meetingName'), {
      target: { value: 'My Live Session' },
    });
    fireEvent.change(screen.getByLabelText('liveSession.scheduledAt'), {
      target: { value: '2026-06-01T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /liveSession.scheduleButton/i }));
    await waitFor(() =>
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          contentItemId: 'ci-1',
          meetingName: 'My Live Session',
        })
      )
    );
  });

  it('calls onCreated and onClose on successful creation', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(
      <ScheduleLiveSessionModal
        {...defaultProps}
        onCreated={onCreated}
        onClose={onClose}
      />
    );
    fireEvent.change(screen.getByLabelText('liveSession.meetingName'), {
      target: { value: 'Live Session' },
    });
    fireEvent.change(screen.getByLabelText('liveSession.scheduledAt'), {
      target: { value: '2026-06-01T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /liveSession.scheduleButton/i }));
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows mutation error message on failure', async () => {
    mockCreateSession.mockResolvedValue({
      error: { message: 'Session creation failed' },
    });
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('liveSession.meetingName'), {
      target: { value: 'Bad Session' },
    });
    fireEvent.change(screen.getByLabelText('liveSession.scheduledAt'), {
      target: { value: '2026-06-01T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /liveSession.scheduleButton/i }));
    await waitFor(() =>
      expect(screen.getByText('Session creation failed')).toBeInTheDocument()
    );
  });

  it('submit button disabled while fetching', () => {
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: true } as never,
      mockCreateSession as never,
    ]);
    render(<ScheduleLiveSessionModal {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /liveSession.scheduling/i })
    ).toBeDisabled();
  });
});
