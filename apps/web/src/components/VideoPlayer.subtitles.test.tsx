import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from './VideoPlayer';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('hls.js', () => ({
  default: {
    isSupported: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('./VideoSubtitleSelector', () => ({
  VideoSubtitleSelector: vi.fn(
    ({
      tracks,
      activeLanguage,
      onChange,
    }: {
      tracks: { language: string; label: string; src: string }[];
      activeLanguage: string | null;
      onChange: (lang: string | null) => void;
    }) => (
      <div data-testid="subtitle-selector">
        <button
          data-testid="subtitle-selector-btn"
          onClick={() =>
            onChange(activeLanguage ? null : (tracks[0]?.language ?? null))
          }
        >
          CC ({tracks.length})
        </button>
        {tracks.map((t) => (
          <button
            key={t.language}
            data-testid={`subtitle-lang-${t.language}`}
            aria-selected={t.language === activeLanguage}
            onClick={() => onChange(t.language)}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
  }: {
    value: number[];
    onValueChange: (v: number[]) => void;
  }) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
    />
  ),
}));

vi.mock('@/lib/mock-content-data', () => ({ Bookmark: {} }));

// ── Test data ─────────────────────────────────────────────────────────────────

const SUBTITLE_TRACKS = [
  { language: 'he', label: 'Hebrew', src: 'https://example.com/vtt/he.vtt' },
  { language: 'fr', label: 'French', src: 'https://example.com/vtt/fr.vtt' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VideoPlayer — subtitle tracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT render subtitle selector when no subtitleTracks provided', () => {
    render(<VideoPlayer src="video.mp4" />);
    expect(screen.queryByTestId('subtitle-selector')).not.toBeInTheDocument();
  });

  it('does NOT render subtitle selector when subtitleTracks is empty array', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={[]} />);
    expect(screen.queryByTestId('subtitle-selector')).not.toBeInTheDocument();
  });

  it('renders subtitle selector when subtitleTracks has entries', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />);
    expect(screen.getByTestId('subtitle-selector')).toBeInTheDocument();
  });

  it('renders correct track count in selector', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />);
    expect(screen.getByTestId('subtitle-selector-btn')).toHaveTextContent(
      'CC (2)'
    );
  });

  it('renders a language button for each track', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />);
    expect(screen.getByTestId('subtitle-lang-he')).toBeInTheDocument();
    expect(screen.getByTestId('subtitle-lang-fr')).toBeInTheDocument();
  });

  it('renders <track> elements inside <video> for each subtitle track', () => {
    const { container } = render(
      <VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />
    );
    const tracks = container.querySelectorAll('video > track');
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toHaveAttribute('srclang', 'he');
    expect(tracks[0]).toHaveAttribute('label', 'Hebrew');
    expect(tracks[1]).toHaveAttribute('srclang', 'fr');
    expect(tracks[1]).toHaveAttribute('label', 'French');
  });

  it('sets kind="subtitles" on all <track> elements', () => {
    const { container } = render(
      <VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />
    );
    const tracks = container.querySelectorAll('video > track');
    tracks.forEach((t) => {
      expect(t).toHaveAttribute('kind', 'subtitles');
    });
  });

  it('no subtitle is active by default (aria-selected=false for all)', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />);
    expect(screen.getByTestId('subtitle-lang-he')).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByTestId('subtitle-lang-fr')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('activates a subtitle language when clicked', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />);
    fireEvent.click(screen.getByTestId('subtitle-lang-he'));
    expect(screen.getByTestId('subtitle-lang-he')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('subtitle-lang-fr')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('deactivates subtitle when selector toggle is clicked while active', () => {
    render(<VideoPlayer src="video.mp4" subtitleTracks={SUBTITLE_TRACKS} />);
    // Activate he
    fireEvent.click(screen.getByTestId('subtitle-lang-he'));
    expect(screen.getByTestId('subtitle-lang-he')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // Toggle off via the CC button
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    expect(screen.getByTestId('subtitle-lang-he')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });
});
