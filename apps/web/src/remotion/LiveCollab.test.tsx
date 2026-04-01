/**
 * Tests for remotion/LiveCollab.tsx
 *
 * Covers: component renders without crashing, exports exist,
 * instructor/student panels rendered, knowledge graph sidebar appears after frame 540.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const useCurrentFrameMock = vi.fn(() => 0);

vi.mock('remotion', () => ({
  useCurrentFrame: (...args: unknown[]) => useCurrentFrameMock(...args),
  useVideoConfig: vi.fn(() => ({
    width: 1280,
    height: 720,
    fps: 30,
    durationInFrames: 750,
  })),
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
    (input: number, inputRange: number[], outputRange: number[]) => {
      const [inMin, inMax] = inputRange;
      const [outMin, outMax] = outputRange;
      const t = Math.max(0, Math.min(1, (input - inMin) / (inMax - inMin)));
      return outMin + t * (outMax - outMin);
    }
  ),
}));

import { LiveCollab } from './LiveCollab';
import { render } from '@testing-library/react';

describe('LiveCollab', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(LiveCollab).toBeDefined();
    expect(typeof LiveCollab).toBe('function');
  });

  it('renders without crashing at frame 0', () => {
    const { container } = render(<LiveCollab />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the session header', () => {
    const { container } = render(<LiveCollab />);
    expect(container.textContent).toContain('EduSphere Live');
    expect(container.textContent).toContain('24 online');
  });

  it('renders instructor and student panel labels', () => {
    const { container } = render(<LiveCollab />);
    expect(container.textContent).toContain('Course Document');
    expect(container.textContent).toContain('Student View');
  });

  it('does not show knowledge graph sidebar before frame 540', () => {
    useCurrentFrameMock.mockReturnValue(100);
    const { container } = render(<LiveCollab />);
    expect(container.textContent).not.toContain('Knowledge Graph');
  });

  it('shows knowledge graph sidebar after frame 540', () => {
    useCurrentFrameMock.mockReturnValue(600);
    const { container } = render(<LiveCollab />);
    expect(container.textContent).toContain('Knowledge Graph');
    expect(container.textContent).toContain('Neural Networks');
    expect(container.textContent).toContain('Backpropagation');
  });

  it('shows comment bubble after frame 378', () => {
    useCurrentFrameMock.mockReturnValue(400);
    const { container } = render(<LiveCollab />);
    expect(container.textContent).toContain('knowledge graph');
  });
});
