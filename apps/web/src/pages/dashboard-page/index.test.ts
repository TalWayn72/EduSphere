import { describe, it, expect } from 'vitest';

describe('dashboard-page/index barrel', () => {
  it('re-exports DashboardPage', async () => {
    const mod = await import('./index');
    expect(mod.DashboardPage).toBeDefined();
  });
});
