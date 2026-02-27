/** Minimal vitest mock for react-native — avoids Flow `import typeof` parse errors. */
import { vi } from 'vitest';

export const Platform = {
  OS: 'ios' as const,
  select: (map: Record<string, unknown>) =>
    map['ios'] ?? map['default'] ?? undefined,
};

export const AppState = {
  currentState: 'active' as const,
  addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
};
