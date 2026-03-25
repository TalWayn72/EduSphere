import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

import { useLearningPath } from './use-learning-path';

describe('useLearningPath', () => {
  it('exports useLearningPath function', () => {
    expect(typeof useLearningPath).toBe('function');
  });
});
