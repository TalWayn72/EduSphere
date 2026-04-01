/**
 * Tests for remotion/Root.tsx
 *
 * Covers: RemotionRoot exports, all 7 Composition registrations rendered.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

const compositionCalls: Array<{
  id: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}> = [];

vi.mock('remotion', () => ({
  Composition: (props: Record<string, unknown>) => {
    compositionCalls.push({
      id: props.id as string,
      durationInFrames: props.durationInFrames as number,
      fps: props.fps as number,
      width: props.width as number,
      height: props.height as number,
    });
    return null;
  },
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 300,
  })),
  AbsoluteFill: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  spring: vi.fn(() => 0.5),
  interpolate: vi.fn(() => 0),
}));

vi.mock('./AIChavrutaTyping', () => ({ AIChavrutaTyping: () => null }));
vi.mock('./HeroBackground', () => ({ HeroBackground: () => null }));
vi.mock('./KnowledgeGraphGrow', () => ({ KnowledgeGraphGrow: () => null }));
vi.mock('./LiveCollab', () => ({ LiveCollab: () => null }));
vi.mock('./OnboardingSpeed', () => ({ OnboardingSpeed: () => null }));
vi.mock('./ProgressJourney', () => ({ ProgressJourney: () => null }));
vi.mock('./StatsCounter', () => ({ StatsCounter: () => null }));

import { RemotionRoot } from './Root';
import { render } from '@testing-library/react';

describe('RemotionRoot', () => {
  it('is exported as a named function', () => {
    expect(RemotionRoot).toBeDefined();
    expect(typeof RemotionRoot).toBe('function');
  });

  it('renders without crashing', () => {
    compositionCalls.length = 0;
    render(<RemotionRoot />);
    expect(compositionCalls.length).toBeGreaterThan(0);
  });

  it('registers all 7 compositions', () => {
    compositionCalls.length = 0;
    render(<RemotionRoot />);
    const ids = compositionCalls.map((c) => c.id);
    expect(ids).toContain('KnowledgeGraphGrow');
    expect(ids).toContain('AIChavrutaTyping');
    expect(ids).toContain('ProgressJourney');
    expect(ids).toContain('LiveCollab');
    expect(ids).toContain('OnboardingSpeed');
    expect(ids).toContain('HeroBackground');
    expect(ids).toContain('StatsCounter');
    expect(ids.length).toBe(7);
  });

  it('registers KnowledgeGraphGrow with correct dimensions', () => {
    compositionCalls.length = 0;
    render(<RemotionRoot />);
    const kg = compositionCalls.find((c) => c.id === 'KnowledgeGraphGrow');
    expect(kg).toBeDefined();
    expect(kg!.width).toBe(1920);
    expect(kg!.height).toBe(1080);
    expect(kg!.fps).toBe(30);
    expect(kg!.durationInFrames).toBe(360);
  });

  it('registers StatsCounter with default props', () => {
    compositionCalls.length = 0;
    render(<RemotionRoot />);
    const sc = compositionCalls.find((c) => c.id === 'StatsCounter');
    expect(sc).toBeDefined();
    expect(sc!.width).toBe(400);
    expect(sc!.height).toBe(200);
  });
});
