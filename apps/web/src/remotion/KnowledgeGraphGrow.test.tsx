/**
 * Tests for remotion/KnowledgeGraphGrow.tsx
 *
 * Covers: component renders without crashing, exports exist,
 * SVG graph nodes and edges rendered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const useCurrentFrameMock = vi.fn(() => 0);
const useVideoConfigMock = vi.fn(() => ({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 360,
}));

vi.mock('remotion', () => ({
  useCurrentFrame: (...args: unknown[]) => useCurrentFrameMock(...args),
  useVideoConfig: (...args: unknown[]) => useVideoConfigMock(...args),
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

import { KnowledgeGraphGrow } from './KnowledgeGraphGrow';
import { render } from '@testing-library/react';

describe('KnowledgeGraphGrow', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(KnowledgeGraphGrow).toBeDefined();
    expect(typeof KnowledgeGraphGrow).toBe('function');
  });

  it('renders without crashing at frame 0', () => {
    const { container } = render(<KnowledgeGraphGrow />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<KnowledgeGraphGrow />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders node labels in SVG text elements', () => {
    const { container } = render(<KnowledgeGraphGrow />);
    const texts = container.querySelectorAll('text');
    // 9 nodes = 9 text labels
    expect(texts.length).toBe(9);
    const labels = Array.from(texts).map((t) => t.textContent);
    expect(labels).toContain('Knowledge Graph');
    expect(labels).toContain('Memory');
    expect(labels).toContain('Active Recall');
  });

  it('renders edge lines in SVG', () => {
    const { container } = render(<KnowledgeGraphGrow />);
    const lines = container.querySelectorAll('line');
    // 12 edges
    expect(lines.length).toBe(12);
  });

  it('renders at mid-animation frame', () => {
    useCurrentFrameMock.mockReturnValue(180);
    const { container } = render(<KnowledgeGraphGrow />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
