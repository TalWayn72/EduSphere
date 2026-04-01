/**
 * Barrel re-export tests for landing/index.ts
 */
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion used by landing components
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return false;
        return (props: Record<string, unknown>) => {
          const { children, ...rest } = props;
          return { type: prop, props: rest, children };
        };
      },
    }
  ),
  AnimatePresence: ({ children }: { children: unknown }) => children,
  useInView: vi.fn(() => true),
  useAnimation: vi.fn(() => ({ start: vi.fn() })),
}));

// Mock gsap
vi.mock('gsap', () => ({
  default: { registerPlugin: vi.fn(), to: vi.fn(), fromTo: vi.fn() },
  gsap: { registerPlugin: vi.fn(), to: vi.fn(), fromTo: vi.fn() },
}));
vi.mock('gsap/ScrollTrigger', () => ({
  default: { create: vi.fn() },
  ScrollTrigger: { create: vi.fn() },
}));
vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn((cb: () => void) => cb()),
}));

import * as barrel from './index';

describe('landing/index barrel', () => {
  it('exports HeroSection', () => {
    expect(barrel.HeroSection).toBeDefined();
  });

  it('exports TrustBar', () => {
    expect(barrel.TrustBar).toBeDefined();
  });

  it('exports ComplianceBadgesSection', () => {
    expect(barrel.ComplianceBadgesSection).toBeDefined();
  });

  it('exports VsCompetitorsSection', () => {
    expect(barrel.VsCompetitorsSection).toBeDefined();
  });

  it('exports UniqueFeaturesSection', () => {
    expect(barrel.UniqueFeaturesSection).toBeDefined();
  });

  it('exports HowPilotWorksSection', () => {
    expect(barrel.HowPilotWorksSection).toBeDefined();
  });

  it('exports AICourseBuildSection', () => {
    expect(barrel.AICourseBuildSection).toBeDefined();
  });

  it('exports ROICalculatorSection', () => {
    expect(barrel.ROICalculatorSection).toBeDefined();
  });

  it('exports PricingSection', () => {
    expect(barrel.PricingSection).toBeDefined();
  });

  it('exports PilotCTASection', () => {
    expect(barrel.PilotCTASection).toBeDefined();
  });

  it('exports TestimonialsSection', () => {
    expect(barrel.TestimonialsSection).toBeDefined();
  });

  it('exports LandingFooter', () => {
    expect(barrel.LandingFooter).toBeDefined();
  });

  it('exports AnimatedCounter', () => {
    expect(barrel.AnimatedCounter).toBeDefined();
  });

  it('exports MotionCard', () => {
    expect(barrel.MotionCard).toBeDefined();
  });

  it('exports TestimonialsCarousel', () => {
    expect(barrel.TestimonialsCarousel).toBeDefined();
  });

  it('exports VideoSection', () => {
    expect(barrel.VideoSection).toBeDefined();
  });
});
