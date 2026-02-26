import { vi } from 'vitest';

export interface MockNatsClient {
  publish: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

export interface MockKVStore {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

export interface MockNatsKVClient {
  kv: MockKVStore;
  close: ReturnType<typeof vi.fn>;
}

export function createMockNatsClient(): MockNatsClient {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockKVStore(): MockKVStore {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockNatsKVClient(): MockNatsKVClient {
  return {
    kv: createMockKVStore(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}
