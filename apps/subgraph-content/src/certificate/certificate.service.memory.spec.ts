/**
 * Memory-safety tests for CertificateService.
 * Verifies that onModuleDestroy() properly closes NATS subscription
 * and database pools to prevent resource leaks.
 *
 * vi.mock factories are hoisted before all imports; all mock references must
 * use vi.hoisted() so they are available at hoist time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificateService } from './certificate.service';
import { CertificatePdfService } from './certificate-pdf.service';

const hoisted = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn();
  const mockNatsClose = vi.fn().mockResolvedValue(undefined);
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

  const idleSub = {
    unsubscribe: mockUnsubscribe,
    [Symbol.asyncIterator]() {
      return { next: vi.fn().mockResolvedValue({ done: true, value: undefined }) };
    },
  };

  return { mockUnsubscribe, mockNatsClose, mockCloseAllPools, idleSub };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: { certificates: {} },
  eq: vi.fn(),
  withTenantContext: vi.fn((_db: unknown, _ctx: unknown, fn: (db: unknown) => unknown) => fn({})),
  closeAllPools: hoisted.mockCloseAllPools,
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue(hoisted.idleSub),
    close: hoisted.mockNatsClose,
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn(), decode: vi.fn() })),
}));

describe('CertificateService — memory safety', () => {
  let service: CertificateService;
  let pdfService: CertificatePdfService;

  beforeEach(() => {
    vi.clearAllMocks();
    pdfService = { generateAndUpload: vi.fn() } as unknown as CertificatePdfService;
    service = new CertificateService(pdfService);
  });

  it('calls subscription.unsubscribe() on destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(hoisted.mockUnsubscribe).toHaveBeenCalledOnce();
  });

  it('closes the NATS connection on destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(hoisted.mockNatsClose).toHaveBeenCalledOnce();
  });

  it('calls closeAllPools() to release DB connections', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(hoisted.mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('handles destroy without prior init gracefully (no errors)', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
