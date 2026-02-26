/**
 * alt-text-generator.service.memory.spec.ts
 * Memory-safety tests for AltTextGeneratorService (F-023).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUnsubscribe, mockDrain, mockConnect, mockCloseAllPools } =
  vi.hoisted(() => {
    const mockUnsubscribe = vi.fn();
    const mockDrain = vi.fn().mockResolvedValue(undefined);
    const makeNc = () => ({
      subscribe: vi.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe,
        [Symbol.asyncIterator]: async function* () {},
      }),
      drain: mockDrain,
      close: vi.fn().mockResolvedValue(undefined),
    });
    const mockConnect = vi
      .fn()
      .mockImplementation(() => Promise.resolve(makeNc()));
    const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
    return { mockUnsubscribe, mockDrain, mockConnect, mockCloseAllPools };
  });

vi.mock('nats', () => ({
  connect: mockConnect,
  StringCodec: vi.fn().mockReturnValue({ decode: vi.fn(), encode: vi.fn() }),
}));
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({ update: vi.fn() })),
  closeAllPools: mockCloseAllPools,
  schema: { media_assets: {} },
}));
vi.mock('@edusphere/config', () => ({
  minioConfig: {
    useSSL: false,
    endpoint: 'localhost',
    port: 9000,
    bucket: 'tb',
    region: 'us-east-1',
    accessKey: 'k',
    secretKey: 's',
  },
}));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return {};
  }),
  GetObjectCommand: vi.fn().mockImplementation((a: unknown) => a),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn() }));
vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn().mockReturnValue((m: string) => m),
}));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn().mockReturnValue((m: string) => m),
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn().mockReturnValue({}) }));

import { AltTextGeneratorService } from './alt-text-generator.service.js';

describe('AltTextGeneratorService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrain.mockResolvedValue(undefined);
  });

  it('unsubscribes NATS subscription on module destroy', async () => {
    const svc = new AltTextGeneratorService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('drains NATS connection on module destroy', async () => {
    const svc = new AltTextGeneratorService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  it('calls closeAllPools() on module destroy', async () => {
    const svc = new AltTextGeneratorService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy is safe when init was never called', async () => {
    const svc = new AltTextGeneratorService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('second onModuleDestroy does not re-drain', async () => {
    const svc = new AltTextGeneratorService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    await svc.onModuleDestroy();
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });
});
