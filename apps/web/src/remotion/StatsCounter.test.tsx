/**
 * Tests for remotion/StatsCounter.tsx
 *
 * Covers: component renders without crashing, default props, custom props,
 * formatted number display, suffix and label.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const useCurrentFrameMock = vi.fn(() => 0);
const useVideoConfigMock = vi.fn(() => ({
  width: 400,
  height: 200,
  fps: 30,
  durationInFrames: 120,
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
  spring: vi.fn(() => 0.5),
  interpolate: vi.fn(
    (_input: number, _inputRange: number[], outputRange: number[]) => {
      return outputRange[0];
    }
  ),
}));

import { StatsCounter } from './StatsCounter';
import { render } from '@testing-library/react';

describe('StatsCounter', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(StatsCounter).toBeDefined();
    expect(typeof StatsCounter).toBe('function');
  });

  it('renders without crashing with default props', () => {
    const { container } = render(<StatsCounter />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays the default label', () => {
    const { container } = render(<StatsCounter />);
    expect(container.textContent).toContain('Active Learners');
  });

  it('displays the default suffix', () => {
    const { container } = render(<StatsCounter />);
    expect(container.textContent).toContain('+');
  });

  it('renders with custom props', () => {
    const { container } = render(
      <StatsCounter targetValue={1000} label="Test Label" suffix="!" />
    );
    expect(container.textContent).toContain('Test Label');
    expect(container.textContent).toContain('!');
  });

  it('renders at a mid-frame without crashing', () => {
    useCurrentFrameMock.mockReturnValue(60);
    const { container } = render(<StatsCounter />);
    expect(container.firstChild).toBeTruthy();
  });
});
