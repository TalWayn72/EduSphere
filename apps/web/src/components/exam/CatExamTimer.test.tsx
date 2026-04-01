/**
 * CatExamTimer component tests
 *
 * Verifies:
 *  1. Renders formatted time
 *  2. Has timer role and aria-label
 *  3. Shows warning style when time is low
 *  4. Calls onExpired when timer reaches 0
 *  5. Cleans up interval on unmount (MEMORY SAFETY)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CatExamTimer } from './CatExamTimer';

describe('CatExamTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders formatted time string', () => {
    render(<CatExamTimer totalSeconds={3661} onExpired={vi.fn()} />);
    expect(screen.getByText('61:01')).toBeInTheDocument();
  });

  it('has timer role', () => {
    render(<CatExamTimer totalSeconds={600} onExpired={vi.fn()} />);
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('has aria-label with minutes and seconds', () => {
    render(<CatExamTimer totalSeconds={125} onExpired={vi.fn()} />);
    expect(
      screen.getByLabelText('2 minutes 5 seconds remaining')
    ).toBeInTheDocument();
  });

  it('decrements each second', () => {
    render(<CatExamTimer totalSeconds={10} onExpired={vi.fn()} />);
    expect(screen.getByText('00:10')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('00:07')).toBeInTheDocument();
  });

  it('shows warning style when ≤ 5 minutes', () => {
    render(<CatExamTimer totalSeconds={299} onExpired={vi.fn()} />);
    const timer = screen.getByRole('timer');
    expect(timer.className).toContain('destructive');
    expect(timer.className).toContain('animate-pulse');
  });

  it('does not show warning style when > 5 minutes', () => {
    render(<CatExamTimer totalSeconds={600} onExpired={vi.fn()} />);
    const timer = screen.getByRole('timer');
    expect(timer.className).not.toContain('destructive');
  });

  it('calls onExpired when time reaches 0', () => {
    const onExpired = vi.fn();
    render(<CatExamTimer totalSeconds={2} onExpired={onExpired} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('does not call onExpired more than once', () => {
    const onExpired = vi.fn();
    render(<CatExamTimer totalSeconds={1} onExpired={onExpired} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('cleans up interval on unmount (MEMORY SAFETY)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(
      <CatExamTimer totalSeconds={100} onExpired={vi.fn()} />
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('applies custom className', () => {
    render(
      <CatExamTimer
        totalSeconds={60}
        onExpired={vi.fn()}
        className="custom-class"
      />
    );
    const timer = screen.getByRole('timer');
    expect(timer.className).toContain('custom-class');
  });
});
