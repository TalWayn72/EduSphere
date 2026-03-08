import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('web-vitals', () => ({
  onCLS: vi.fn((cb) => cb({ name: 'CLS', value: 0.05 })),
  onINP: vi.fn((cb) => cb({ name: 'INP', value: 10 })),
  onLCP: vi.fn((cb) => cb({ name: 'LCP', value: 2000 })),
  onFCP: vi.fn((cb) => cb({ name: 'FCP', value: 1000 })),
  onTTFB: vi.fn((cb) => cb({ name: 'TTFB', value: 300 })),
}));

describe('reportWebVitals', () => {
  let sendBeaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendBeaconMock = vi.fn();
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });
    vi.stubEnv('VITE_VITALS_ENDPOINT', 'http://localhost:4001/vitals');
  });

  it('sends CLS metric via sendBeacon', async () => {
    const { reportWebVitals } = await import('./vitals');
    reportWebVitals();
    expect(sendBeaconMock).toHaveBeenCalledWith(
      'http://localhost:4001/vitals',
      expect.stringContaining('CLS'),
    );
  });

  it('does nothing when VITE_VITALS_ENDPOINT is not set', async () => {
    vi.stubEnv('VITE_VITALS_ENDPOINT', '');
    const { reportWebVitals } = await import('./vitals');
    reportWebVitals();
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });
});
