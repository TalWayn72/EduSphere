import { describe, it, expect } from 'vitest';

describe('course-detail/index barrel', () => {
  it('re-exports CourseDetailPage', async () => {
    const mod = await import('./index');
    expect(mod.CourseDetailPage).toBeDefined();
  });
});
