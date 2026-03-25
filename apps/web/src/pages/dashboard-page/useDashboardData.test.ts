import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', displayName: 'Test', role: 'STUDENT' }),
  DEV_MODE: true,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { useDashboardData } from './useDashboardData';

describe('useDashboardData', () => {
  it('exports useDashboardData function', () => {
    expect(typeof useDashboardData).toBe('function');
  });
});
