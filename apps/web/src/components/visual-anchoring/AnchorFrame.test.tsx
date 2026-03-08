import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React, { createRef } from 'react';
import AnchorFrame from './AnchorFrame';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContainerWithAnchor(anchorId: string) {
  const container = document.createElement('div');
  container.scrollTop = 0;

  const anchor = document.createElement('span');
  anchor.setAttribute('data-anchor-id', anchorId);
  container.appendChild(anchor);

  // Mock getBoundingClientRect for container and anchor
  container.getBoundingClientRect = vi.fn(() => ({
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
  anchor.getBoundingClientRect = vi.fn(() => ({
    top: 100,
    left: 50,
    right: 350,
    bottom: 130,
    width: 300,
    height: 30,
    x: 50,
    y: 100,
    toJSON: () => ({}),
  }));

  return { container, anchor };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AnchorFrame', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when activeAnchorId is null', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={ref}>
        <AnchorFrame activeAnchorId={null} containerRef={ref} />
      </div>
    );
    expect(container.querySelector('[data-testid="anchor-frame"]')).toBeNull();
  });

  it('renders frame at correct position based on [data-anchor-id] element', () => {
    const { container: domContainer } = makeContainerWithAnchor('test-anchor');
    document.body.appendChild(domContainer);

    const containerRef = { current: domContainer };

    const { container } = render(
      <AnchorFrame
        activeAnchorId="test-anchor"
        containerRef={containerRef as React.RefObject<HTMLElement>}
      />
    );

    const frame = container.querySelector('[data-testid="anchor-frame"]') as HTMLElement;
    expect(frame).not.toBeNull();
    // top = elRect.top(100) - containerRect.top(0) + scrollTop(0) - 2 = 98
    expect(frame.style.top).toBe('98px');
    // left = elRect.left(50) - containerRect.left(0) - 2 = 48
    expect(frame.style.left).toBe('48px');
    // width = elRect.width(300) + 4 = 304
    expect(frame.style.width).toBe('304px');
    // height = elRect.height(30) + 4 = 34
    expect(frame.style.height).toBe('34px');

    document.body.removeChild(domContainer);
  });

  it('calls onFrameClick with the anchor ID when clicked', () => {
    const { container: domContainer } = makeContainerWithAnchor('click-anchor');
    document.body.appendChild(domContainer);

    const containerRef = { current: domContainer };
    const onFrameClick = vi.fn();

    const { container } = render(
      <AnchorFrame
        activeAnchorId="click-anchor"
        containerRef={containerRef as React.RefObject<HTMLElement>}
        onFrameClick={onFrameClick}
      />
    );

    const frame = container.querySelector('[data-testid="anchor-frame"]') as HTMLElement;
    expect(frame).not.toBeNull();
    fireEvent.click(frame);
    expect(onFrameClick).toHaveBeenCalledWith('click-anchor');

    document.body.removeChild(domContainer);
  });

  it('calls onFrameClick on Enter key press', () => {
    const { container: domContainer } = makeContainerWithAnchor('key-anchor');
    document.body.appendChild(domContainer);

    const containerRef = { current: domContainer };
    const onFrameClick = vi.fn();

    const { container } = render(
      <AnchorFrame
        activeAnchorId="key-anchor"
        containerRef={containerRef as React.RefObject<HTMLElement>}
        onFrameClick={onFrameClick}
      />
    );

    const frame = container.querySelector('[data-testid="anchor-frame"]') as HTMLElement;
    fireEvent.keyDown(frame, { key: 'Enter' });
    expect(onFrameClick).toHaveBeenCalledWith('key-anchor');

    document.body.removeChild(domContainer);
  });

  it('removes scroll and resize listeners on unmount', () => {
    const { container: domContainer } = makeContainerWithAnchor('remove-anchor');
    document.body.appendChild(domContainer);

    const containerRef = { current: domContainer };
    const removeSpy = vi.spyOn(domContainer, 'removeEventListener');
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <AnchorFrame
        activeAnchorId="remove-anchor"
        containerRef={containerRef as React.RefObject<HTMLElement>}
      />
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    document.body.removeChild(domContainer);
  });
});
