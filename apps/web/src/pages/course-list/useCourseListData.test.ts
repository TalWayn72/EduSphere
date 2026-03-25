import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'STUDENT' }),
  DEV_MODE: true,
}));

import { useCourseListData } from './useCourseListData';

describe('useCourseListData', () => {
  it('exports useCourseListData function', () => {
    expect(typeof useCourseListData).toBe('function');
  });
});
