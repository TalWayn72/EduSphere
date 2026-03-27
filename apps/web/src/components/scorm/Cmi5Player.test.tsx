import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { Cmi5Player } from './Cmi5Player';

describe('Cmi5Player', () => {
  const defaultProps = {
    auUrl: 'https://example.com/au?endpoint=lrs&session=abc',
    sessionId: 'session-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an iframe with data-testid="cmi5-player"', () => {
    render(<Cmi5Player {...defaultProps} />);
    expect(screen.getByTestId('cmi5-player')).toBeInTheDocument();
  });

  it('iframe src is the auUrl prop', () => {
    render(<Cmi5Player {...defaultProps} />);
    const iframe = screen.getByTestId('cmi5-player') as HTMLIFrameElement;
    expect(iframe.src).toBe(defaultProps.auUrl);
  });

  it('iframe has title "cmi5 Assignable Unit"', () => {
    render(<Cmi5Player {...defaultProps} />);
    expect(screen.getByTitle('cmi5 Assignable Unit')).toBeInTheDocument();
  });

  it('applies default className when no className prop', () => {
    render(<Cmi5Player {...defaultProps} />);
    const iframe = screen.getByTestId('cmi5-player') as HTMLIFrameElement;
    expect(iframe.className).toBe('w-full h-full min-h-[600px] border-0');
  });

  it('applies custom className when provided', () => {
    render(<Cmi5Player {...defaultProps} className="my-class" />);
    const iframe = screen.getByTestId('cmi5-player') as HTMLIFrameElement;
    expect(iframe.className).toBe('my-class');
  });

  it('iframe has sandbox attribute with required permissions', () => {
    render(<Cmi5Player {...defaultProps} />);
    const iframe = screen.getByTestId('cmi5-player') as HTMLIFrameElement;
    const sandbox = iframe.getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).toContain('allow-same-origin');
    expect(sandbox).toContain('allow-forms');
    expect(sandbox).toContain('allow-popups');
  });

  it('calls onLaunched on mount', () => {
    const onLaunched = vi.fn();
    render(<Cmi5Player {...defaultProps} onLaunched={onLaunched} />);
    expect(onLaunched).toHaveBeenCalledTimes(1);
  });

  it('adds message event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<Cmi5Player {...defaultProps} />);
    expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('removes message event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Cmi5Player {...defaultProps} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('calls onTerminated when receiving matching cmi5:terminated message', async () => {
    const onTerminated = vi.fn();
    render(
      <Cmi5Player {...defaultProps} onTerminated={onTerminated} />,
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'cmi5:terminated', sessionId: 'session-123' },
        }),
      );
    });

    expect(onTerminated).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onTerminated for non-matching sessionId', async () => {
    const onTerminated = vi.fn();
    render(
      <Cmi5Player {...defaultProps} onTerminated={onTerminated} />,
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'cmi5:terminated', sessionId: 'wrong-session' },
        }),
      );
    });

    expect(onTerminated).not.toHaveBeenCalled();
  });

  it('does NOT call onTerminated for non-cmi5:terminated message type', async () => {
    const onTerminated = vi.fn();
    render(
      <Cmi5Player {...defaultProps} onTerminated={onTerminated} />,
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'other-event', sessionId: 'session-123' },
        }),
      );
    });

    expect(onTerminated).not.toHaveBeenCalled();
  });

  it('ignores non-object postMessage data', async () => {
    const onTerminated = vi.fn();
    render(
      <Cmi5Player {...defaultProps} onTerminated={onTerminated} />,
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', { data: 'string-data' }),
      );
      window.dispatchEvent(
        new MessageEvent('message', { data: null }),
      );
      window.dispatchEvent(
        new MessageEvent('message', { data: 42 }),
      );
    });

    expect(onTerminated).not.toHaveBeenCalled();
  });

  it('does not call onTerminated when no onTerminated prop provided', async () => {
    // Should not throw
    render(<Cmi5Player {...defaultProps} />);

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'cmi5:terminated', sessionId: 'session-123' },
        }),
      );
    });
    // No assertion needed — just verify no throw
  });
});
