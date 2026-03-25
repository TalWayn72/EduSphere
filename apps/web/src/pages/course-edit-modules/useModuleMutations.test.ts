import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { useModuleMutations } from './useModuleMutations';

describe('useModuleMutations', () => {
  it('exports useModuleMutations function', () => {
    expect(typeof useModuleMutations).toBe('function');
  });
});
