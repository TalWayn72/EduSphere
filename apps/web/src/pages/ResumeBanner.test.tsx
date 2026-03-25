import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ResumeBanner } from './ResumeBanner';
import type { VisualAnchor } from '@/components/visual-anchoring/visual-anchor.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createAnchor(overrides?: Partial<VisualAnchor>): VisualAnchor {
  return {
    id: 'anchor-1',
    documentOrder: 0,
    visualAsset: null,
    ...overrides,
  } as VisualAnchor;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResumeBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Hebrew resume text', () => {
    const onResume = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ResumeBanner activeAnchor={undefined} onResume={onResume} onDismiss={onDismiss} />,
    );
    expect(screen.getByText('המשך מהמקום שעצרת')).toBeInTheDocument();
  });

  it('renders resume and dismiss buttons', () => {
    render(
      <ResumeBanner activeAnchor={undefined} onResume={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText('המשך')).toBeInTheDocument();
    expect(screen.getByText('התחל מהתחלה')).toBeInTheDocument();
  });

  it('calls onResume when resume button is clicked', () => {
    const onResume = vi.fn();
    render(
      <ResumeBanner activeAnchor={undefined} onResume={onResume} onDismiss={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('המשך'));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ResumeBanner activeAnchor={undefined} onResume={vi.fn()} onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByText('התחל מהתחלה'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('auto-dismisses after 8 seconds', () => {
    const onDismiss = vi.fn();
    render(
      <ResumeBanner activeAnchor={undefined} onResume={vi.fn()} onDismiss={onDismiss} />,
    );
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('clears timeout on unmount (memory safety)', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <ResumeBanner activeAnchor={undefined} onResume={vi.fn()} onDismiss={onDismiss} />,
    );
    unmount();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('shows image when activeAnchor has visualAsset', () => {
    const anchor = createAnchor({
      visualAsset: { webpUrl: 'https://img.test/pic.webp', storageUrl: 'https://img.test/pic.png' } as VisualAnchor['visualAsset'],
    });
    render(
      <ResumeBanner activeAnchor={anchor} onResume={vi.fn()} onDismiss={vi.fn()} />,
    );
    const img = document.querySelector('img[src="https://img.test/pic.webp"]');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not show image when activeAnchor is undefined', () => {
    render(
      <ResumeBanner activeAnchor={undefined} onResume={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(document.querySelector('img')).toBeNull();
  });

  it('has accessible role="status" and aria-live', () => {
    const { container } = render(
      <ResumeBanner activeAnchor={undefined} onResume={vi.fn()} onDismiss={vi.fn()} />,
    );
    const banner = container.querySelector('[role="status"]');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
