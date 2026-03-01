import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { LiveSessionCard } from './LiveSessionCard';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'liveSession.joining': 'Joining...',
        'liveSession.startMeeting': 'Start Meeting',
        'liveSession.joinSession': 'Join Session',
        'liveSession.joinError': 'Failed to join',
        'liveSession.recordingAvailable': 'Recording Available',
        'liveSession.processingRecording': 'Processing recording...',
      };
      return map[key] ?? key;
    },
  })),
}));

vi.mock('@/lib/graphql/live-session.queries', () => ({
  JOIN_LIVE_SESSION_MUTATION: 'JOIN_LIVE_SESSION_MUTATION',
}));

const BASE_SESSION = {
  id: 'sess-1',
  meetingName: 'React Workshop',
  scheduledAt: '2026-03-15T14:00:00Z',
  status: 'LIVE',
  recordingUrl: null as string | null,
};

let mockJoinSession: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockJoinSession = vi
    .fn()
    .mockResolvedValue({ data: { joinLiveSession: '' }, error: undefined });
  vi.mocked(urql.useMutation).mockReturnValue([{} as never, mockJoinSession as never]);
});

function renderCard(
  sessionOverride: Partial<typeof BASE_SESSION> = {},
  userRole?: string
) {
  const session = { ...BASE_SESSION, ...sessionOverride };
  return render(<LiveSessionCard liveSession={session} userRole={userRole} />);
}

describe('LiveSessionCard', () => {
  it('renders meeting name in card title', () => {
    renderCard();
    expect(screen.getByText('React Workshop')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    renderCard({ status: 'LIVE' });
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows join button for LIVE status', () => {
    renderCard({ status: 'LIVE' });
    expect(
      screen.getByRole('button', { name: /join session/i })
    ).toBeInTheDocument();
  });

  it('shows join button for SCHEDULED status', () => {
    renderCard({ status: 'SCHEDULED' });
    expect(
      screen.getByRole('button', { name: /join session/i })
    ).toBeInTheDocument();
  });

  it('hides join button for ENDED status', () => {
    renderCard({ status: 'ENDED' });
    expect(
      screen.queryByRole('button', { name: /join/i })
    ).not.toBeInTheDocument();
  });

  it('hides join button for RECORDING status', () => {
    renderCard({ status: 'RECORDING' });
    expect(
      screen.queryByRole('button', { name: /join/i })
    ).not.toBeInTheDocument();
  });

  it('shows "Start Meeting" for instructor role', () => {
    renderCard({ status: 'LIVE' }, 'INSTRUCTOR');
    expect(
      screen.getByRole('button', { name: /start meeting/i })
    ).toBeInTheDocument();
  });

  it('shows "Join Session" for learner role', () => {
    renderCard({ status: 'LIVE' }, 'LEARNER');
    expect(
      screen.getByRole('button', { name: /join session/i })
    ).toBeInTheDocument();
  });

  it('shows recording section for ENDED status with recordingUrl', () => {
    renderCard(
      { status: 'ENDED', recordingUrl: 'https://example.com/rec.mp4' },
      'LEARNER'
    );
    expect(screen.getByText('Recording Available')).toBeInTheDocument();
  });

  it('shows processing message for RECORDING status', () => {
    renderCard({ status: 'RECORDING' });
    expect(screen.getByText('Processing recording...')).toBeInTheDocument();
  });

  it('calls joinSession mutation when join button is clicked', async () => {
    renderCard({ status: 'LIVE' });
    fireEvent.click(screen.getByRole('button', { name: /join session/i }));
    await waitFor(() =>
      expect(mockJoinSession).toHaveBeenCalledWith({ sessionId: 'sess-1' })
    );
  });

  it('shows error message when mutation returns an error', async () => {
    mockJoinSession.mockResolvedValueOnce({
      data: null,
      error: { message: 'Permission denied' },
    });
    renderCard({ status: 'LIVE' });
    fireEvent.click(screen.getByRole('button', { name: /join session/i }));
    await waitFor(() =>
      expect(screen.getByText('Permission denied')).toBeInTheDocument()
    );
  });
});
