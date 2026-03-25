import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ courseId: 'c-1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'STUDENT' }),
  DEV_MODE: true,
}));

// The hook uses urql queries internally; we test via module mock
import { useCourseDetailQueries } from './useCourseDetailQueries';

describe('useCourseDetailQueries', () => {
  it('module exports useCourseDetailQueries function', () => {
    expect(typeof useCourseDetailQueries).toBe('function');
  });
});
