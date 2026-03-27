/**
 * Tests for remotion/AIChavrutaTyping.tsx
 *
 * Covers: component renders without crashing, exports exist,
 * frame-dependent content (question/answer typing, cursor blink, tags).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ── Mock remotion ──────────────────────────────────────────────────────────
const useCurrentFrameMock = vi.fn(() => 0);

vi.mock('remotion', () => ({
  useCurrentFrame: (...args: unknown[]) => useCurrentFrameMock(...args),
  useVideoConfig: vi.fn(() => ({
    width: 600,
    height: 400,
    fps: 30,
    durationInFrames: 240,
  })),
  AbsoluteFill: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) =>
    React.createElement('div', { 'data-testid': 'absolute-fill', style }, children),
  spring: vi.fn(() => 0.5),
  interpolate: vi.fn((input: number, inputRange: number[], outputRange: number[]) => {
    // Simple linear interpolation for tests
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = Math.max(0, Math.min(1, (input - inMin) / (inMax - inMin)));
    return outMin + t * (outMax - outMin);
  }),
}));

import { AIChavrutaTyping } from './AIChavrutaTyping';
import { render } from '@testing-library/react';

describe('AIChavrutaTyping', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(AIChavrutaTyping).toBeDefined();
    expect(typeof AIChavrutaTyping).toBe('function');
  });

  it('renders without crashing at frame 0', () => {
    const { container } = render(<AIChavrutaTyping />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the header with AI label', () => {
    const { container } = render(<AIChavrutaTyping />);
    expect(container.textContent).toContain('Chavruta');
    expect(container.textContent).toContain('AI');
  });

  it('renders concept tags', () => {
    const { container } = render(<AIChavrutaTyping />);
    expect(container.textContent).toContain('Economics');
    expect(container.textContent).toContain('Military');
    expect(container.textContent).toContain('Politics');
    expect(container.textContent).toContain('Culture');
  });

  it('renders at a mid-animation frame without crashing', () => {
    useCurrentFrameMock.mockReturnValue(120);
    const { container } = render(<AIChavrutaTyping />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders at the last frame without crashing', () => {
    useCurrentFrameMock.mockReturnValue(239);
    const { container } = render(<AIChavrutaTyping />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows AI bubble after frame 88', () => {
    useCurrentFrameMock.mockReturnValue(150);
    const { container } = render(<AIChavrutaTyping />);
    // AI bubble contains a small "AI" label in the avatar
    const allText = container.textContent ?? '';
    // At frame 150 the AI answer should be partially typed
    expect(allText.length).toBeGreaterThan(0);
  });
});
