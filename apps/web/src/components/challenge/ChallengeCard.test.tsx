import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChallengeCard } from './ChallengeCard';

const CHALLENGE = {
  id: 'ch-1',
  title: 'Speed Quiz',
  description: 'Answer 10 questions fast',
  challengeType: 'QUIZ',
  targetScore: 80,
  startDate: '2026-03-01T00:00:00Z',
  endDate: '2026-04-01T00:00:00Z',
  maxParticipants: 100,
  participantCount: 42,
  status: 'ACTIVE',
};

describe('ChallengeCard', () => {
  it('renders challenge title', () => {
    render(<ChallengeCard challenge={CHALLENGE} onJoin={vi.fn()} />);
    expect(screen.getByText('Speed Quiz')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ChallengeCard challenge={CHALLENGE} onJoin={vi.fn()} />);
    expect(screen.getByText('Answer 10 questions fast')).toBeInTheDocument();
  });

  it('shows participant count', () => {
    render(<ChallengeCard challenge={CHALLENGE} onJoin={vi.fn()} />);
    expect(screen.getByText(/42 \/ 100/)).toBeInTheDocument();
  });

  it('shows challenge type badge', () => {
    render(<ChallengeCard challenge={CHALLENGE} onJoin={vi.fn()} />);
    expect(screen.getByText('QUIZ')).toBeInTheDocument();
  });

  it('calls onJoin when join clicked', () => {
    const onJoin = vi.fn();
    render(<ChallengeCard challenge={CHALLENGE} onJoin={onJoin} />);
    fireEvent.click(screen.getByText('Join'));
    expect(onJoin).toHaveBeenCalledWith('ch-1');
  });

  it('join button disabled when not ACTIVE', () => {
    render(
      <ChallengeCard
        challenge={{ ...CHALLENGE, status: 'ENDED' }}
        onJoin={vi.fn()}
      />
    );
    expect(screen.getByText('Join')).toBeDisabled();
  });

  it('shows Joining text when isJoining', () => {
    render(<ChallengeCard challenge={CHALLENGE} onJoin={vi.fn()} isJoining />);
    expect(screen.getByText('Joining...')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    render(<ChallengeCard challenge={CHALLENGE} onJoin={vi.fn()} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
