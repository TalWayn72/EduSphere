/**
 * Barrel re-export tests for scorm/index.ts
 */
import { describe, it, expect, vi } from 'vitest';

// Mock urql before importing ScormPlayer (it uses useMutation)
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      '',
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(() => [
    { fetching: false, data: undefined, error: undefined, stale: false, operation: undefined },
    vi.fn(),
  ]),
}));

import * as scormBarrel from './index';

describe('scorm/index barrel', () => {
  it('exports ScormPlayer', () => {
    expect(scormBarrel.ScormPlayer).toBeDefined();
    expect(typeof scormBarrel.ScormPlayer).toBe('function');
  });

  it('exports ScormImportDialog', () => {
    expect(scormBarrel.ScormImportDialog).toBeDefined();
    expect(typeof scormBarrel.ScormImportDialog).toBe('function');
  });
});
