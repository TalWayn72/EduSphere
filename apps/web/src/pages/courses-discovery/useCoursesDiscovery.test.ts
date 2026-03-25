import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({
  DEV_MODE: true,
}));

import { useCoursesDiscovery } from './useCoursesDiscovery';

describe('useCoursesDiscovery', () => {
  it('exports useCoursesDiscovery function', () => {
    expect(typeof useCoursesDiscovery).toBe('function');
  });
});
