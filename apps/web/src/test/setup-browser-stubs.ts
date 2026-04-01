// ── Browser API stubs (not available in jsdom) ──────────────────────────────

// window.matchMedia: used by ReducedMotionProvider and other media-query hooks.
// jsdom does not implement matchMedia — stub it so tests don't throw.
if (!globalThis.window.matchMedia) {
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ResizeObserver: used by @radix-ui/react-use-size (Radix Select, Tooltip, etc.)
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// IntersectionObserver: used by VideoSection autoplay-on-visible logic and
// AnimatedCounter scroll-triggered counting animation. The stub immediately
// fires the callback with isIntersecting:true so animations resolve in tests.
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    private _cb: IntersectionObserverCallback;
    constructor(
      cb: IntersectionObserverCallback,
      _opts?: IntersectionObserverInit
    ) {
      this._cb = cb;
    }
    observe(target: Element) {
      // Immediately invoke callback with isIntersecting:true so animated
      // components (AnimatedCounter, VideoSection) behave synchronously in tests.
      this._cb(
        [
          {
            isIntersecting: true,
            target,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
  };
}

// HTMLMediaElement.play / .pause: jsdom defines these but does not implement them
// (returns undefined instead of a Promise). Override them so VideoSection's
// autoplay logic does not throw "Cannot read properties of undefined (reading 'catch')".
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  configurable: true,
  value: () => Promise.resolve(),
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  configurable: true,
  value: () => undefined,
});
