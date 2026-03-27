import { describe, it, expect } from 'vitest';

describe('knowledge-graph/index barrel', () => {
  it('re-exports KnowledgeGraph', async () => {
    const mod = await import('./index');
    expect(mod.KnowledgeGraph).toBeDefined();
  });
});
