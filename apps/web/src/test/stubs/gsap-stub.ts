// GSAP stub for vitest/jsdom — GSAP uses browser APIs not available in jsdom.
// All exported values are no-ops so component tests can import GSAP without crashing.

const noop = () => {};
const noopReturnsThis = () => ({});

export const gsap = {
  registerPlugin: noop,
  fromTo: () => noopReturnsThis(),
  from: () => noopReturnsThis(),
  to: () => noopReturnsThis(),
  set: noop,
  timeline: () => ({
    fromTo: () => noopReturnsThis(),
    from: () => noopReturnsThis(),
    to: () => noopReturnsThis(),
    add: () => noopReturnsThis(),
    play: noop,
    pause: noop,
    kill: noop,
  }),
  context: (_fn: () => void, _scope?: unknown) => ({
    revert: noop,
    kill: noop,
  }),
  killTweensOf: noop,
};

export default gsap;

export const ScrollTrigger = {
  create: noop,
  refresh: noop,
  kill: noop,
  getAll: () => [] as unknown[],
  addEventListener: noop,
  removeEventListener: noop,
};
