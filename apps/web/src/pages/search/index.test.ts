import { describe, it, expect } from 'vitest';

describe('search/index barrel', () => {
  it('re-exports SearchPage', async () => {
    const mod = await import('./index');
    expect(mod.SearchPage).toBeDefined();
  });
});
