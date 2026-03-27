import { describe, it, expect } from 'vitest';

describe('course-edit-modules/index barrel', () => {
  it('re-exports CourseEditModules', async () => {
    const mod = await import('./index');
    expect(mod.CourseEditModules).toBeDefined();
  });
});
