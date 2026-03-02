import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Hls from 'hls.js';
import { VideoPlayer } from './VideoPlayer';

vi.mock('@/lib/mock-content-data', () => ({}));

vi.mock('@/components/ui/slider', () => ({
  Slider: vi.fn(({ value }: { value: number[] }) => (
    <div role="slider" aria-valuenow={value?.[0] ?? 0} data-testid="slider" />
  )),
}));

vi.mock('hls.js', () => {
  // Use mockReturnValue (not mockImplementation) so vi.fn() stays constructable
  const mockHlsInstance = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    destroy: vi.fn(),
  };
  const MockHls = Object.assign(vi.fn().mockReturnValue(mockHlsInstance), {
    isSupported: vi.fn(() => true),
  });
  return { default: MockHls };
});

beforeAll(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(
    window.HTMLMediaElement.prototype,
    'requestFullscreen',
    {
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    }
  );
  Object.defineProperty(document, 'exitFullscreen', {
    writable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // Restore isSupported default after clearAllMocks clears mock state
  (
    Hls as unknown as { isSupported: ReturnType<typeof vi.fn> }
  ).isSupported.mockReturnValue(true);
  // Do NOT re-set Hls mockImplementation — factory implementation persists
  // and arrow functions used with mockImplementation cannot be called with `new`
});

describe('VideoPlayer', () => {
  it('renders a video element', () => {
    const { container } = render(<VideoPlayer src="test.mp4" />);
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('renders 3 control buttons (play, mute, fullscreen)', () => {
    render(<VideoPlayer src="test.mp4" />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('shows initial time display "0:00 / 0:00"', () => {
    render(<VideoPlayer src="test.mp4" />);
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
  });

  it('renders 2 sliders (seek bar and volume)', () => {
    render(<VideoPlayer src="test.mp4" />);
    expect(screen.getAllByTestId('slider')).toHaveLength(2);
  });

  it('renders bookmark markers with title labels', () => {
    const bookmarks = [
      { id: 'bm-1', timestamp: 30, label: 'Key Point', color: '#ff0000' },
      { id: 'bm-2', timestamp: 60, label: 'Summary', color: '#00ff00' },
    ];
    render(<VideoPlayer src="test.mp4" bookmarks={bookmarks} />);
    expect(screen.getByTitle('Key Point')).toBeInTheDocument();
    expect(screen.getByTitle('Summary')).toBeInTheDocument();
  });

  it('calls Hls.isSupported for .m3u8 hlsSrc URL', () => {
    // Force isSupported=false so new Hls() is never reached (vi.fn not constructable in v4)
    const hlsAny = Hls as unknown as { isSupported: ReturnType<typeof vi.fn> };
    hlsAny.isSupported.mockReturnValueOnce(false);
    render(<VideoPlayer src="fallback.mp4" hlsSrc="stream.m3u8" />);
    expect(hlsAny.isSupported).toHaveBeenCalled();
  });

  it('does not initialize Hls when hlsSrc is not provided', () => {
    render(<VideoPlayer src="test.mp4" />);
    expect(vi.mocked(Hls)).not.toHaveBeenCalled();
  });

  it('does not initialize Hls when hlsSrc is a non-.m3u8 url', () => {
    render(<VideoPlayer src="test.mp4" hlsSrc="video.mp4" />);
    expect(vi.mocked(Hls)).not.toHaveBeenCalled();
  });

  it('renders without error when hlsSrc is null', () => {
    const { container } = render(<VideoPlayer src="test.mp4" hlsSrc={null} />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(vi.mocked(Hls)).not.toHaveBeenCalled();
  });

  it('unmounts cleanly without errors (memory safety)', () => {
    // When no HLS is active, unmount should not throw
    const { unmount } = render(<VideoPlayer src="test.mp4" />);
    expect(() => unmount()).not.toThrow();
  });
});
