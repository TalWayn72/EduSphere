import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Captions: () => <span data-testid="captions-icon" />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { VideoSubtitleSelector } from './VideoSubtitleSelector';

const TRACKS = [
  { language: 'en', label: 'English', src: '/subs/en.vtt' },
  { language: 'he', label: '', src: '/subs/he.vtt' },
  { language: 'ar', label: '', src: '/subs/ar.vtt' },
];

describe('VideoSubtitleSelector', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no tracks', () => {
    const { container } = render(
      <VideoSubtitleSelector tracks={[]} active={null} onChange={onChange} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders toggle button when tracks exist', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('subtitle-selector-btn')).toBeInTheDocument();
  });

  it('button has aria-haspopup=listbox', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('subtitle-selector-btn')).toHaveAttribute(
      'aria-haspopup',
      'listbox'
    );
  });

  it('clicking button opens menu', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    expect(screen.getByTestId('subtitle-menu')).toBeInTheDocument();
  });

  it('menu has Off option', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    expect(screen.getByTestId('subtitle-lang-off')).toHaveTextContent('Off');
  });

  it('menu has language options', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    expect(screen.getByTestId('subtitle-lang-en')).toBeInTheDocument();
    expect(screen.getByTestId('subtitle-lang-he')).toBeInTheDocument();
    expect(screen.getByTestId('subtitle-lang-ar')).toBeInTheDocument();
  });

  it('uses track label if provided, falls back to LANG_LABELS', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    expect(screen.getByTestId('subtitle-lang-en')).toHaveTextContent('English');
    expect(screen.getByTestId('subtitle-lang-he')).toHaveTextContent('Hebrew');
    expect(screen.getByTestId('subtitle-lang-ar')).toHaveTextContent('Arabic');
  });

  it('clicking a language calls onChange with language code', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    fireEvent.click(screen.getByTestId('subtitle-lang-en'));
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('clicking Off calls onChange with null', () => {
    render(
      <VideoSubtitleSelector tracks={TRACKS} active="en" onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    fireEvent.click(screen.getByTestId('subtitle-lang-off'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('active language has aria-selected=true', () => {
    render(
      <VideoSubtitleSelector tracks={TRACKS} active="he" onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    expect(screen.getByTestId('subtitle-lang-he')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('subtitle-lang-en')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('menu closes after selection', () => {
    render(
      <VideoSubtitleSelector
        tracks={TRACKS}
        active={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('subtitle-selector-btn'));
    fireEvent.click(screen.getByTestId('subtitle-lang-en'));
    expect(screen.queryByTestId('subtitle-menu')).not.toBeInTheDocument();
  });
});
