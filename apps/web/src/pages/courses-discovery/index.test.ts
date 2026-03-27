import { describe, it, expect } from 'vitest';

describe('courses-discovery/index barrel', () => {
  it('re-exports CoursesDiscoveryPage', async () => {
    const mod = await import('./index');
    expect(mod.CoursesDiscoveryPage).toBeDefined();
  });

  it('re-exports DiscoveryFilters', async () => {
    const mod = await import('./index');
    expect(mod.DiscoveryFilters).toBeDefined();
  });

  it('re-exports SkeletonCard', async () => {
    const mod = await import('./index');
    expect(mod.SkeletonCard).toBeDefined();
  });

  it('re-exports constants', async () => {
    const mod = await import('./index');
    expect(mod.CATEGORY_FILTERS).toBeDefined();
    expect(mod.LEVEL_FILTERS).toBeDefined();
    expect(mod.SORT_OPTIONS).toBeDefined();
    expect(mod.DURATION_FILTERS).toBeDefined();
    expect(mod.PAGE_SIZE).toBeDefined();
  });
});
