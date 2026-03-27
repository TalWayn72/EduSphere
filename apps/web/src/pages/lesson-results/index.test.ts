import { describe, it, expect } from 'vitest';

describe('lesson-results/index barrel', () => {
  it('re-exports LessonResultsPage', async () => {
    const mod = await import('./index');
    expect(mod.LessonResultsPage).toBeDefined();
  });
});
