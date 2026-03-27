import { describe, it, expect } from 'vitest';

describe('content-viewer/index barrel', () => {
  it('re-exports ContentViewer', async () => {
    const mod = await import('./index');
    expect(mod.ContentViewer).toBeDefined();
  });
});
