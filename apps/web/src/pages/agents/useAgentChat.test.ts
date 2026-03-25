import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'STUDENT' }),
  DEV_MODE: true,
}));

import { useAgentChat } from './useAgentChat';

describe('useAgentChat', () => {
  it('exports useAgentChat function', () => {
    expect(typeof useAgentChat).toBe('function');
  });
});
