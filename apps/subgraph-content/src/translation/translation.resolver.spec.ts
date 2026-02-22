import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { TranslationResolver } from './translation.resolver';

// ── Service mock ───────────────────────────────────────────────────────────
const mockTranslationService = {
  findTranslation: vi.fn(),
  requestTranslation: vi.fn(),
};

// ── Fixtures ───────────────────────────────────────────────────────────────
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const MOCK_TRANSLATION = {
  id: 'tr-1',
  content_item_id: VALID_UUID,
  locale: 'he',
  translation_status: 'COMPLETED',
  model_used: 'ollama/llama3.2',
};

const AUTH_CTX = {
  authContext: {
    userId: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@test.com',
    username: 'user',
    roles: ['STUDENT' as const],
    scopes: [],
    isSuperAdmin: false,
  },
};

const NO_AUTH_CTX = { authContext: undefined };

// ── Tests ──────────────────────────────────────────────────────────────────
describe('TranslationResolver', () => {
  let resolver: TranslationResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new TranslationResolver(mockTranslationService as never);
  });

  // ── getContentTranslation ──────────────────────────────────────────────
  describe('getContentTranslation()', () => {
    it('delegates to service.findTranslation and returns result', async () => {
      mockTranslationService.findTranslation.mockResolvedValue(MOCK_TRANSLATION);
      const result = await resolver.getContentTranslation(VALID_UUID, 'he', AUTH_CTX);
      expect(mockTranslationService.findTranslation).toHaveBeenCalledWith(
        VALID_UUID,
        'he',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
      );
      expect(result).toEqual(MOCK_TRANSLATION);
    });

    it('returns null when translation not found', async () => {
      mockTranslationService.findTranslation.mockResolvedValue(null);
      const result = await resolver.getContentTranslation(VALID_UUID, 'fr', AUTH_CTX);
      expect(result).toBeNull();
    });

    it('throws UnauthorizedException when authContext is missing', async () => {
      await expect(
        resolver.getContentTranslation(VALID_UUID, 'he', NO_AUTH_CTX),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('derives userRole from first roles entry', async () => {
      mockTranslationService.findTranslation.mockResolvedValue(MOCK_TRANSLATION);
      await resolver.getContentTranslation(VALID_UUID, 'he', AUTH_CTX);
      expect(mockTranslationService.findTranslation).toHaveBeenCalledWith(
        VALID_UUID,
        'he',
        expect.objectContaining({ userRole: 'STUDENT' }),
      );
    });
  });

  // ── requestContentTranslation ──────────────────────────────────────────
  describe('requestContentTranslation()', () => {
    it('delegates to service.requestTranslation for a valid UUID', async () => {
      mockTranslationService.requestTranslation.mockResolvedValue(MOCK_TRANSLATION);
      const result = await resolver.requestContentTranslation(VALID_UUID, 'he', AUTH_CTX);
      expect(mockTranslationService.requestTranslation).toHaveBeenCalledWith(
        VALID_UUID,
        'he',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
      );
      expect(result).toEqual(MOCK_TRANSLATION);
    });

    it('throws BadRequestException when contentItemId is not a valid UUID', async () => {
      await expect(
        resolver.requestContentTranslation('not-a-uuid', 'he', AUTH_CTX),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when targetLocale is too short', async () => {
      await expect(
        resolver.requestContentTranslation(VALID_UUID, 'x', AUTH_CTX),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when targetLocale is longer than 10 chars', async () => {
      await expect(
        resolver.requestContentTranslation(VALID_UUID, 'en-US-extended', AUTH_CTX),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when authContext is missing', async () => {
      await expect(
        resolver.requestContentTranslation(VALID_UUID, 'he', NO_AUTH_CTX),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not call service when UUID is invalid', async () => {
      await expect(
        resolver.requestContentTranslation('bad-id', 'he', AUTH_CTX),
      ).rejects.toThrow(BadRequestException);
      expect(mockTranslationService.requestTranslation).not.toHaveBeenCalled();
    });
  });
});
