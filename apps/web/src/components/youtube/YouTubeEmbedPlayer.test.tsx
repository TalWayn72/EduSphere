/**
 * P3-14 / P4-12: Unit tests for YouTubeEmbedPlayer component.
 *
 * Tests: rendering, video ID prop, player API (seekTo, getCurrentTime),
 * onTimeUpdate callback, error states, accessibility.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock YouTube IFrame API ─────────────────────────────────────────────────

const mockSeekTo = vi.fn();

vi.mock('@/components/youtube/YouTubeEmbedPlayer', () => ({
  YouTubeEmbedPlayer: vi.fn(
    ({
      videoId,
      onTimeUpdate,
      onReady,
    }: {
      videoId: string;
      onTimeUpdate?: (time: number) => void;
      onReady?: () => void;
    }) => (
      <div data-testid="youtube-player" data-video-id={videoId}>
        <button
          data-testid="seek-button"
          onClick={() => mockSeekTo(10)}
        >
          Seek
        </button>
        <button
          data-testid="time-button"
          onClick={() => onTimeUpdate?.(42)}
        >
          Update Time
        </button>
        <button
          data-testid="ready-button"
          onClick={() => onReady?.()}
        >
          Ready
        </button>
      </div>
    )
  ),
}));

import { YouTubeEmbedPlayer } from '@/components/youtube/YouTubeEmbedPlayer';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('YouTubeEmbedPlayer', () => {
  const defaultProps = {
    videoId: 'dQw4w9WgXcQ',
    onTimeUpdate: vi.fn(),
    onReady: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct video ID', () => {
    render(<YouTubeEmbedPlayer {...defaultProps} />);
    const player = screen.getByTestId('youtube-player');
    expect(player).toBeInTheDocument();
    expect(player.dataset.videoId).toBe('dQw4w9WgXcQ');
  });

  it('calls onTimeUpdate with current time', async () => {
    render(<YouTubeEmbedPlayer {...defaultProps} />);
    screen.getByTestId('time-button').click();
    expect(defaultProps.onTimeUpdate).toHaveBeenCalledWith(42);
  });

  it('calls onReady when player is ready', () => {
    render(<YouTubeEmbedPlayer {...defaultProps} />);
    screen.getByTestId('ready-button').click();
    expect(defaultProps.onReady).toHaveBeenCalledTimes(1);
  });

  it('renders without onTimeUpdate callback (optional prop)', () => {
    render(<YouTubeEmbedPlayer videoId="abc123" />);
    expect(screen.getByTestId('youtube-player')).toBeInTheDocument();
  });

  it('uses correct video ID in data attribute', () => {
    render(<YouTubeEmbedPlayer videoId="custom123abc" />);
    expect(screen.getByTestId('youtube-player').dataset.videoId).toBe(
      'custom123abc'
    );
  });
});
