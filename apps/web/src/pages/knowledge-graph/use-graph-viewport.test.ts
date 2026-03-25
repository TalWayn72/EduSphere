import { describe, it, expect } from 'vitest';

import { useGraphViewport } from './use-graph-viewport';

describe('useGraphViewport', () => {
  it('exports useGraphViewport function', () => {
    expect(typeof useGraphViewport).toBe('function');
  });
});
