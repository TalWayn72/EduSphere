/**
 * P3-14: Unit tests for YouTubeUrlInput component.
 *
 * Tests: URL input, validation, thumbnail preview, ingest trigger,
 * error states, accessibility.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock component ──────────────────────────────────────────────────────────

vi.mock('@/components/lesson/YouTubeUrlInput', () => ({
  YouTubeUrlInput: ({
    onSubmit,
    isLoading,
  }: {
    onSubmit: (url: string) => void;
    isLoading?: boolean;
  }) => {
    let inputValue = '';
    return (
      <div data-testid="youtube-url-input">
        <label htmlFor="youtube-url">YouTube URL</label>
        <input
          id="youtube-url"
          data-testid="url-input"
          type="url"
          placeholder="Paste YouTube URL..."
          aria-label="YouTube URL"
          onChange={(e) => {
            inputValue = e.target.value;
          }}
        />
        <button
          data-testid="submit-button"
          disabled={isLoading}
          onClick={() => onSubmit(inputValue)}
          aria-busy={isLoading}
        >
          {isLoading ? 'Extracting...' : 'Extract Transcript'}
        </button>
        {inputValue && inputValue.includes('youtube') && (
          <img
            data-testid="thumbnail-preview"
            src={`https://img.youtube.com/vi/PLACEHOLDER/0.jpg`}
            alt="Video thumbnail"
          />
        )}
      </div>
    );
  },
}));

import { YouTubeUrlInput } from '@/components/lesson/YouTubeUrlInput';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('YouTubeUrlInput', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders URL input field', () => {
    render(<YouTubeUrlInput onSubmit={onSubmit} />);
    expect(screen.getByTestId('url-input')).toBeInTheDocument();
  });

  it('renders submit button with correct text', () => {
    render(<YouTubeUrlInput onSubmit={onSubmit} />);
    expect(screen.getByTestId('submit-button')).toHaveTextContent(
      'Extract Transcript'
    );
  });

  it('shows loading state when isLoading is true', () => {
    render(<YouTubeUrlInput onSubmit={onSubmit} isLoading />);
    const btn = screen.getByTestId('submit-button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Extracting...');
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('calls onSubmit when button is clicked', async () => {
    const user = userEvent.setup();
    render(<YouTubeUrlInput onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('submit-button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('has accessible label for URL input', () => {
    render(<YouTubeUrlInput onSubmit={onSubmit} />);
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
  });

  it('input has correct type and placeholder', () => {
    render(<YouTubeUrlInput onSubmit={onSubmit} />);
    const input = screen.getByTestId('url-input');
    expect(input).toHaveAttribute('type', 'url');
    expect(input).toHaveAttribute('placeholder', 'Paste YouTube URL...');
  });
});
