import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayerCore } from './VideoPlayerCore';

// hls.js mock — isSupported returns false so non-HLS path is taken
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported() {
      return false;
    }
    static Events = { MANIFEST_PARSED: 'hlsManifestParsed' };
    loadSource = vi.fn();
    attachMedia = vi.fn();
    on = vi.fn();
    destroy = vi.fn();
    currentLevel = -1;
  },
}));

// jsdom stubs for video element APIs
Object.defineProperty(window.HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(window.HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});
Object.defineProperty(window.HTMLVideoElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
});

describe('VideoPlayerCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the video player container with data-testid', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    expect(screen.getByTestId('video-player-core')).toBeInTheDocument();
  });

  it('renders a video element', () => {
    const { container } = render(
      <VideoPlayerCore src="https://example.com/video.mp4" />
    );
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('renders Play button initially (paused state)', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('renders Mute button initially', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
  });

  it('renders Fullscreen button', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    expect(
      screen.getByRole('button', { name: 'Fullscreen' })
    ).toBeInTheDocument();
  });

  it('renders initial timestamp 0:00 / 0:00', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
  });

  it('renders speed selector button with default 1x', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    // The speed trigger button contains "1×"
    expect(screen.getByText(/^1×/)).toBeInTheDocument();
  });

  it('renders seek bar with aria-label Seek', () => {
    render(<VideoPlayerCore src="https://example.com/video.mp4" />);
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
  });

  it('renders bookmark markers when provided', () => {
    const bookmarks = [
      { id: 'bm1', timestamp: 30, label: 'Key moment', color: '#ff0000' },
    ];
    const { container } = render(
      <VideoPlayerCore
        src="https://example.com/video.mp4"
        bookmarks={bookmarks}
      />
    );
    const marker = container.querySelector('[title="Key moment"]');
    expect(marker).toBeInTheDocument();
  });

  it('calls onTimeUpdate when timeupdate fires on video element', () => {
    const onTimeUpdate = vi.fn();
    const { container } = render(
      <VideoPlayerCore
        src="https://example.com/video.mp4"
        onTimeUpdate={onTimeUpdate}
      />
    );
    const video = container.querySelector('video')!;
    // Simulate timeupdate — jsdom currentTime defaults to 0
    Object.defineProperty(video, 'currentTime', { get: () => 42, configurable: true });
    fireEvent(video, new Event('timeupdate'));
    expect(onTimeUpdate).toHaveBeenCalledWith(42);
  });
});
