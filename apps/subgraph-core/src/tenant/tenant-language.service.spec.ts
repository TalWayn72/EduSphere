import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseLanguageSettings,
  TenantLanguageService,
  LANG_CACHE_MAX_SIZE,
} from './tenant-language.service';

// vi.hoisted ensures these are initialized before the vi.mock factory runs
const { mockWhere, mockLimit, mockFrom, mockSet, mockUpdate } = vi.hoisted(
  () => ({
    mockWhere: vi.fn(),
    mockLimit: vi.fn(),
    mockFrom: vi.fn(),
    mockSet: vi.fn(),
    mockUpdate: vi.fn(),
  })
);

vi.mock('@edusphere/db', () => ({
  db: {
    select: () => ({ from: mockFrom }),
    update: mockUpdate,
  },
  tenants: { id: 'id', settings: 'settings' },
  eq: vi.fn((col, val) => ({ col, val })),
}));

const ALL_10 = ['en', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'he'];
const DEFAULTS = { supportedLanguages: ALL_10, defaultLanguage: 'en' };

// ─── parseLanguageSettings ────────────────────────────────────────────────────

describe('parseLanguageSettings()', () => {
  it('returns all-locales defaults for null', () => {
    expect(parseLanguageSettings(null)).toEqual(DEFAULTS);
  });

  it('returns all-locales defaults for undefined', () => {
    expect(parseLanguageSettings(undefined)).toEqual(DEFAULTS);
  });

  it('returns defaults for empty object', () => {
    expect(parseLanguageSettings({})).toEqual(DEFAULTS);
  });

  it('returns defaults for a scalar string', () => {
    expect(parseLanguageSettings('bad')).toEqual(DEFAULTS);
  });

  it('returns defaults for an array', () => {
    expect(parseLanguageSettings([])).toEqual(DEFAULTS);
  });

  it('parses a partial object — only supportedLanguages set', () => {
    const result = parseLanguageSettings({ supportedLanguages: ['en', 'he'] });
    expect(result.supportedLanguages).toEqual(['en', 'he']);
    expect(result.defaultLanguage).toBe('en'); // fallback
  });

  it('parses a fully specified valid object', () => {
    const input = {
      supportedLanguages: ['en', 'fr', 'he'],
      defaultLanguage: 'fr',
    };
    expect(parseLanguageSettings(input)).toEqual(input);
  });

  it('falls back to all locales when supportedLanguages is empty array', () => {
    const result = parseLanguageSettings({ supportedLanguages: [] });
    expect(result.supportedLanguages).toEqual(ALL_10);
  });

  it('falls back to "en" defaultLanguage when field is missing', () => {
    const result = parseLanguageSettings({ supportedLanguages: ['en', 'es'] });
    expect(result.defaultLanguage).toBe('en');
  });
});

// ─── TenantLanguageService ────────────────────────────────────────────────────

describe('TenantLanguageService', () => {
  let service: TenantLanguageService;

  const STORED_SETTINGS = {
    supportedLanguages: ['en', 'he', 'fr'],
    defaultLanguage: 'he',
  };
  const OTHER_SETTINGS = {
    someOtherKey: 'value',
    supportedLanguages: ['en'],
    defaultLanguage: 'en',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([{ settings: STORED_SETTINGS }]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    service = new TenantLanguageService();
  });

  describe('getSettings()', () => {
    it('fetches from DB when cache is empty', async () => {
      const result = await service.getSettings('tenant-1');
      expect(mockFrom).toHaveBeenCalled();
      expect(result).toEqual(STORED_SETTINGS);
    });

    it('returns cached value on second call (no additional DB query)', async () => {
      await service.getSettings('tenant-1');
      mockFrom.mockClear();
      const result = await service.getSettings('tenant-1');
      expect(mockFrom).not.toHaveBeenCalled();
      expect(result).toEqual(STORED_SETTINGS);
    });

    it('returns defaults when tenant has no language settings in JSONB', async () => {
      mockLimit.mockResolvedValue([{ settings: {} }]);
      const result = await service.getSettings('tenant-empty');
      expect(result).toEqual(DEFAULTS);
    });

    it('returns defaults when tenant row does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.getSettings('tenant-missing');
      expect(result).toEqual(DEFAULTS);
    });
  });

  describe('updateSettings()', () => {
    it('merges language keys into existing tenant settings, preserving other keys', async () => {
      mockLimit.mockResolvedValue([{ settings: OTHER_SETTINGS }]);
      let capturedSet: Record<string, unknown> | undefined;
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        capturedSet = v;
        return { where: mockWhere };
      });

      await service.updateSettings('tenant-1', {
        supportedLanguages: ['en', 'he'],
        defaultLanguage: 'he',
      });

      expect(capturedSet?.settings).toEqual({
        someOtherKey: 'value', // preserved
        supportedLanguages: ['en', 'he'],
        defaultLanguage: 'he',
      });
    });

    it('invalidates cache after update', async () => {
      await service.getSettings('tenant-1'); // populates cache
      mockFrom.mockClear();

      await service.updateSettings('tenant-1', {
        supportedLanguages: ['en'],
        defaultLanguage: 'en',
      });
      // After invalidation, next getSettings re-queries DB
      await service.getSettings('tenant-1');
      expect(mockFrom).toHaveBeenCalled();
    });

    it('returns updated settings after write', async () => {
      const updated = {
        supportedLanguages: ['en', 'es'],
        defaultLanguage: 'es',
      };
      mockLimit
        .mockResolvedValueOnce([{ settings: {} }]) // read for merge
        .mockResolvedValueOnce([{ settings: updated }]); // read after invalidation
      const result = await service.updateSettings('tenant-1', updated);
      expect(result).toEqual(updated);
    });
  });

  describe('LRU eviction', () => {
    it(`evicts oldest entry when cache reaches ${LANG_CACHE_MAX_SIZE}`, async () => {
      // Fill cache to max
      for (let i = 0; i < LANG_CACHE_MAX_SIZE; i++) {
        mockLimit.mockResolvedValueOnce([{ settings: STORED_SETTINGS }]);
        await service.getSettings(`tenant-${i}`);
      }
      // Adding one more should evict tenant-0
      mockLimit.mockResolvedValueOnce([{ settings: STORED_SETTINGS }]);
      await service.getSettings('tenant-overflow');

      // tenant-0 should no longer be in cache (re-queries DB)
      mockFrom.mockClear();
      mockLimit.mockResolvedValueOnce([{ settings: STORED_SETTINGS }]);
      await service.getSettings('tenant-0');
      expect(mockFrom).toHaveBeenCalled();
    });
  });
});
