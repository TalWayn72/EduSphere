/**
 * Tests for remotion/OnboardingSpeed.tsx
 *
 * Covers: component renders without crashing, exports exist,
 * step cards rendered, timer text appears at later frames.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const useCurrentFrameMock = vi.fn(() => 0);

vi.mock('remotion', () => ({
  useCurrentFrame: (...args: unknown[]) => useCurrentFrameMock(...args),
  useVideoConfig: vi.fn(() => ({
    width: 1920,
    height: 400,
    fps: 30,
    durationInFrames: 300,
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

import { OnboardingSpeed } from './OnboardingSpeed';
import { render } from '@testing-library/react';

describe('OnboardingSpeed', () => {
  beforeEach(() => {
    useCurrentFrameMock.mockReturnValue(0);
  });

  it('is exported as a named function', () => {
    expect(OnboardingSpeed).toBeDefined();
    expect(typeof OnboardingSpeed).toBe('function');
  });

  it('renders without crashing at frame 0', () => {
    const { container } = render(<OnboardingSpeed />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the heading text', () => {
    const { container } = render(<OnboardingSpeed />);
    expect(container.textContent).toContain('Get started in under 60 seconds');
  });

  it('renders all 3 step cards', () => {
    const { container } = render(<OnboardingSpeed />);
    expect(container.textContent).toContain('Sign Up');
    expect(container.textContent).toContain('Set Goals');
    expect(container.textContent).toContain('Start Learning');
  });

  it('renders step descriptions', () => {
    const { container } = render(<OnboardingSpeed />);
    expect(container.textContent).toContain('Create your account');
    expect(container.textContent).toContain('Choose your learning path');
    expect(container.textContent).toContain('AI adapts to you instantly');
  });

  it('renders the timer text', () => {
    useCurrentFrameMock.mockReturnValue(250);
    const { container } = render(<OnboardingSpeed />);
    expect(container.textContent).toContain('Average onboarding: 45 seconds');
  });

  it('renders at the last frame without crashing', () => {
    useCurrentFrameMock.mockReturnValue(299);
    const { container } = render(<OnboardingSpeed />);
    expect(container.firstChild).toBeTruthy();
  });
});
