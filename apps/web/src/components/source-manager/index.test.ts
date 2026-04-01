/**
 * Barrel re-export tests for source-manager/index.ts
 */
import { describe, it, expect, vi } from 'vitest';

// Mock urql used by SourceManager
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
  ]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
}));

// Mock auth used by utils
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
}));

import * as barrel from './index';

describe('source-manager/index barrel', () => {
  it('exports SourceManager component', () => {
    expect(barrel.SourceManager).toBeDefined();
    expect(typeof barrel.SourceManager).toBe('function');
  });

  it('exports getSourceErrorKey utility', () => {
    expect(barrel.getSourceErrorKey).toBeDefined();
    expect(typeof barrel.getSourceErrorKey).toBe('function');
  });

  it('exports getFriendlySourceErrorKey utility', () => {
    expect(barrel.getFriendlySourceErrorKey).toBeDefined();
    expect(typeof barrel.getFriendlySourceErrorKey).toBe('function');
  });

  it('exports parseSourceError utility', () => {
    expect(barrel.parseSourceError).toBeDefined();
    expect(typeof barrel.parseSourceError).toBe('function');
  });

  it('exports hasValidAuth utility', () => {
    expect(barrel.hasValidAuth).toBeDefined();
    expect(typeof barrel.hasValidAuth).toBe('function');
  });
});
