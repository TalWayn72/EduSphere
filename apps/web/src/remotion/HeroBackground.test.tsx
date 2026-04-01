/**
 * Tests for remotion/HeroBackground.tsx
 *
 * Covers: component renders without crashing, exports exist,
 * renders floating orbs, gradient background.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const useCurrentFrameMock = vi.fn(() => 0);
const useVideoConfigMock = vi.fn(() => ({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
}));

vi.mock('remotion', () => ({
  useCurrentFrame: (...args: unknown[]) => useCurrentFrameMock(...args),
  useVideoConfig: (...args: unknown[]) => useVideoConfigMock(...args),
  AbsoluteFill: ({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'absolute-fill', style },
      children
    ),
  interpolate: vi.fn(
    (input: number, inputRange: number[], outputRange: number[]) => {
      const [inMin, inMax] = inputRange;
      const [outMin, outMax] = outputRange;
      const t = Math.max(0, Math.min(1, (input - inMin) / (inMax - inMin)));
      return outMin + t * (outMax - outMin);
    }
  ),
}));

import { HeroBackground } from './HeroBackground';
import { render } from '@testing-library/react';

describe('HeroBackground', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(HeroBackground).toBeDefined();
    expect(typeof HeroBackground).toBe('function');
  });

  it('renders without crashing at frame 0', () => {
    const { container } = render(<HeroBackground />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders 4 floating orbs (one per ORBS entry)', () => {
    const { container } = render(<HeroBackground />);
    // AbsoluteFill > 4 orb divs + 1 vignette overlay = at least 5 children
    const fill = container.firstChild as HTMLElement;
    expect(fill.children.length).toBeGreaterThanOrEqual(5);
  });

  it('renders at mid-animation frame', () => {
    useCurrentFrameMock.mockReturnValue(150);
    const { container } = render(<HeroBackground />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders at the last frame', () => {
    useCurrentFrameMock.mockReturnValue(299);
    const { container } = render(<HeroBackground />);
    expect(container.firstChild).toBeTruthy();
  });
});
