/**
 * Tests for remotion/ProgressJourney.tsx
 *
 * Covers: component renders without crashing, exports exist,
 * milestone labels rendered, XP counter displayed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const useCurrentFrameMock = vi.fn(() => 0);

vi.mock('remotion', () => ({
  useCurrentFrame: (...args: unknown[]) => useCurrentFrameMock(...args),
  useVideoConfig: vi.fn(() => ({
    width: 800,
    height: 150,
    fps: 30,
    durationInFrames: 180,
  })),
  AbsoluteFill: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) =>
    React.createElement('div', { 'data-testid': 'absolute-fill', style }, children),
  spring: vi.fn(() => 0.5),
  interpolate: vi.fn((input: number, inputRange: number[], outputRange: number[]) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = Math.max(0, Math.min(1, (input - inMin) / (inMax - inMin)));
    return outMin + t * (outMax - outMin);
  }),
}));

import { ProgressJourney } from './ProgressJourney';
import { render } from '@testing-library/react';

describe('ProgressJourney', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(ProgressJourney).toBeDefined();
    expect(typeof ProgressJourney).toBe('function');
  });

  it('renders without crashing at frame 0', () => {
    const { container } = render(<ProgressJourney />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders milestone labels', () => {
    const { container } = render(<ProgressJourney />);
    const text = container.textContent ?? '';
    expect(text).toContain('Week 1');
    expect(text).toContain('Month 1');
    expect(text).toContain('Course');
    expect(text).toContain('Expert');
  });

  it('renders XP counter', () => {
    const { container } = render(<ProgressJourney />);
    expect(container.textContent).toContain('XP');
  });

  it('renders at the last frame without crashing', () => {
    useCurrentFrameMock.mockReturnValue(179);
    const { container } = render(<ProgressJourney />);
    expect(container.firstChild).toBeTruthy();
  });
});
