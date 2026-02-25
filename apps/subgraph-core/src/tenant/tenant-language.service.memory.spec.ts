import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantLanguageService, LANG_CACHE_MAX_SIZE } from './tenant-language.service';

const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockFrom  = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: { select: () => ({ from: mockFrom }) },
  tenants: { id: 'id', settings: 'settings' },
  eq: vi.fn(),
}));

describe('TenantLanguageService — memory safety', () => {
  let service: TenantLanguageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([{ settings: { supportedLanguages: ['en'], defaultLanguage: 'en' } }]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    service = new TenantLanguageService();
  });

  it('onModuleDestroy clears the cache (no memory leak)', async () => {
    await service.getSettings('tenant-1');
    await service.getSettings('tenant-2');

    // Verify cache is populated
    mockFrom.mockClear();
    await service.getSettings('tenant-1');
    expect(mockFrom).not.toHaveBeenCalled(); // served from cache

    // Destroy service
    service.onModuleDestroy();

    // Cache should be empty — next call hits DB
    mockFrom.mockClear();
    mockLimit.mockResolvedValue([{ settings: {} }]);
    await service.getSettings('tenant-1');
    expect(mockFrom).toHaveBeenCalled();
  });

  it(`cache does not grow beyond ${LANG_CACHE_MAX_SIZE} entries`, async () => {
    for (let i = 0; i <= LANG_CACHE_MAX_SIZE + 5; i++) {
      mockLimit.mockResolvedValueOnce([{ settings: {} }]);
      await service.getSettings(`tenant-${i}`);
    }

    // Access private cache via type assertion for inspection only
    const cache = (service as unknown as { cache: Map<string, unknown> }).cache;
    expect(cache.size).toBeLessThanOrEqual(LANG_CACHE_MAX_SIZE);
  });
});
