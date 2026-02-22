import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationService } from './translation.service';

// ── DB mock atoms ──────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockReturning = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
};

const mockDb = {};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    contentTranslations: {
      content_item_id: 'content_item_id',
      locale: 'locale',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  withTenantContext: vi.fn((_db, _ctx, cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
}));

vi.mock('nats', () => ({
  connect: vi.fn(),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s) })),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────
const MOCK_TRANSLATION = {
  id: 'tr-1',
  content_item_id: 'item-uuid-1',
  locale: 'he',
  translation_status: 'COMPLETED',
  model_used: 'ollama/llama3.2',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const AUTH_CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'STUDENT' as const };

// ── Tests ──────────────────────────────────────────────────────────────────
describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default select chain: select().from().where().limit()
    mockLimit.mockResolvedValue([MOCK_TRANSLATION]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    service = new TranslationService();
  });

  // ── findTranslation ────────────────────────────────────────────────────
  describe('findTranslation()', () => {
    it('returns a translation when one exists', async () => {
      const result = await service.findTranslation('item-uuid-1', 'he', AUTH_CTX);
      expect(result).toEqual(MOCK_TRANSLATION);
    });

    it('returns null when translation not found', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findTranslation('item-uuid-1', 'fr', AUTH_CTX);
      expect(result).toBeNull();
    });

    it('calls withTenantContext with the correct tenantId', async () => {
      const { withTenantContext } = await import('@edusphere/db');
      await service.findTranslation('item-uuid-1', 'he', AUTH_CTX);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function),
      );
    });

    it('uses eq() for content_item_id and locale', async () => {
      const { eq } = await import('@edusphere/db');
      await service.findTranslation('item-uuid-1', 'he', AUTH_CTX);
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'item-uuid-1');
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'he');
    });

    it('applies limit(1)', async () => {
      await service.findTranslation('item-uuid-1', 'he', AUTH_CTX);
      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  // ── requestTranslation ─────────────────────────────────────────────────
  describe('requestTranslation()', () => {
    beforeEach(() => {
      // Default insert chain
      mockReturning.mockResolvedValue([{ ...MOCK_TRANSLATION, translation_status: 'PROCESSING' }]);
      mockOnConflictDoUpdate.mockReturnValue({ returning: mockReturning });
      mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      mockInsert.mockReturnValue({ values: mockValues });
    });

    it('returns existing COMPLETED translation without upserting', async () => {
      mockLimit.mockResolvedValue([{ ...MOCK_TRANSLATION, translation_status: 'COMPLETED' }]);
      const result = await service.requestTranslation('item-uuid-1', 'he', AUTH_CTX);
      expect(result.translation_status).toBe('COMPLETED');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('returns existing PROCESSING translation without upserting', async () => {
      mockLimit.mockResolvedValue([{ ...MOCK_TRANSLATION, translation_status: 'PROCESSING' }]);
      const result = await service.requestTranslation('item-uuid-1', 'he', AUTH_CTX);
      expect(result.translation_status).toBe('PROCESSING');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('upserts a new PROCESSING record when none exists', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.requestTranslation('item-uuid-1', 'fr', AUTH_CTX);
      expect(mockInsert).toHaveBeenCalled();
      expect(result.translation_status).toBe('PROCESSING');
    });

    it('publishes content.translate.requested for new translations', async () => {
      const { connect } = await import('nats');
      const mockNc = { publish: vi.fn(), flush: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      (connect as ReturnType<typeof vi.fn>).mockResolvedValue(mockNc);
      mockLimit.mockResolvedValue([]);
      await service.requestTranslation('item-uuid-1', 'fr', AUTH_CTX);
      expect(connect).toHaveBeenCalled();
      expect(mockNc.publish).toHaveBeenCalledWith('content.translate.requested', expect.anything());
    });

    it('does not throw when NATS publish fails', async () => {
      const { connect } = await import('nats');
      (connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('NATS down'));
      mockLimit.mockResolvedValue([]);
      await expect(service.requestTranslation('item-uuid-1', 'fr', AUTH_CTX)).resolves.toBeDefined();
    });

    it('throws when insert returns no row', async () => {
      mockLimit.mockResolvedValue([]);
      mockReturning.mockResolvedValue([]);
      await expect(service.requestTranslation('item-uuid-1', 'fr', AUTH_CTX)).rejects.toThrow(
        'Failed to upsert translation record',
      );
    });
  });
});
