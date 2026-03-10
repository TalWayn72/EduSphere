import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountdownTimer } from './CountdownTimer';

describe('CountdownTimer', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('shows time remaining for future date', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    render(<CountdownTimer endDate={future} />);
    expect(screen.getByText(/\d+[dhm]/i)).toBeInTheDocument();
  });

  it('shows Ended for past date', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    render(<CountdownTimer endDate={past} />);
    expect(screen.getByText(/[Ee]nded/i)).toBeInTheDocument();
  });

  it('clears interval on unmount (memory safety)', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const future = new Date(Date.now() + 86400000).toISOString();
    const { unmount } = render(<CountdownTimer endDate={future} />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
