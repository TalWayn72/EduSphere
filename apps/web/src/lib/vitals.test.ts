import { describe, it, expect, vi, afterEach } from 'vitest';

describe('reportWebVitals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a callable function', async () => {
    const { reportWebVitals } = await import('./vitals');
    expect(typeof reportWebVitals).toBe('function');
    expect(() => reportWebVitals()).not.toThrow();
  });

  it('does not throw when navigator.sendBeacon is available', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });
    const { reportWebVitals } = await import('./vitals');
    expect(() => reportWebVitals()).not.toThrow();
  });
});
