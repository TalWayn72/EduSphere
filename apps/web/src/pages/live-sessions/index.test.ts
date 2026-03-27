import { describe, it, expect } from 'vitest';

describe('live-sessions/index barrel', () => {
  it('re-exports LiveSessionsPage', async () => {
    const mod = await import('./index');
    expect(mod.LiveSessionsPage).toBeDefined();
  });
});
