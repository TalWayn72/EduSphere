import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';

// ── Mock @edusphere/db ───────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    agent_definitions: { id: 'id', name: 'name', tenant_id: 'tenant_id' },
    agent_executions: { id: 'id', status: 'status', output: 'output' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
}));

// ── Mock cert-exam-gen.adapter ──────────────────────────────────────────────

const mockRunCertExamGenerator = vi.fn();
vi.mock('./cert-exam-gen.adapter.js', () => ({
  runCertExamGenerator: (...args: unknown[]) => mockRunCertExamGenerator(...args),
}));

// ── Mock ollama-ai-provider ─────────────────────────────────────────────────

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn(() => ({ modelId: 'llama3.2' }))),
}));

// ── Mock LlmConsentGuard ────────────────────────────────────────────────────

const mockAssertConsent = vi.fn().mockResolvedValue(undefined);

// ── Mock execution-pubsub ───────────────────────────────────────────────────

const mockPubSubPublish = vi.fn();

// ── Import after mocks ──────────────────────────────────────────────────────

import { CertExamGenService } from './cert-exam-gen.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildService(): CertExamGenService {
  return new CertExamGenService(
    { assertConsent: mockAssertConsent } as never,
    { publish: mockPubSubPublish } as never,
  );
}

const defaultOptions = {
  moduleId: 'mod-1',
  targetBloomLevels: ['REMEMBER', 'UNDERSTAND'],
  targetCount: 5,
  targetDifficulty: 'medium',
  locale: 'en',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CertExamGenService', () => {
  let service: CertExamGenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── generateItems ─────────────────────────────────────────────────────────

  describe('generateItems', () => {
    it('asserts LLM consent before proceeding', async () => {
      mockSelectLimit.mockResolvedValueOnce([{ id: 'agent-def-1' }]);
      mockReturning.mockResolvedValueOnce([{ id: 'exec-1', status: 'RUNNING' }]);
      mockRunCertExamGenerator.mockResolvedValue({ items: [], errors: [] });

      await service.generateItems(defaultOptions, 'user-1', 'tenant-1');

      // isExternal depends on env vars OPENAI_API_KEY / ANTHROPIC_API_KEY
      const isExternal = Boolean(
        process.env['OPENAI_API_KEY'] || process.env['ANTHROPIC_API_KEY']
      );
      expect(mockAssertConsent).toHaveBeenCalledWith('user-1', isExternal);
    });

    it('returns executionId with RUNNING status immediately', async () => {
      mockSelectLimit.mockResolvedValueOnce([{ id: 'agent-def-1' }]);
      mockReturning.mockResolvedValueOnce([{ id: 'exec-42', status: 'RUNNING' }]);
      mockRunCertExamGenerator.mockResolvedValue({ items: [], errors: [] });

      const result = await service.generateItems(
        defaultOptions,
        'user-1',
        'tenant-1'
      );

      expect(result).toEqual({
        executionId: 'exec-42',
        status: 'RUNNING',
        itemCount: 0,
      });
    });

    it('creates agent definition if not found', async () => {
      // First query returns empty (no existing def)
      mockSelectLimit.mockResolvedValueOnce([]);
      // Insert returns new def
      mockReturning
        .mockResolvedValueOnce([{ id: 'new-def-1' }])  // agent_definitions insert
        .mockResolvedValueOnce([{ id: 'exec-1', status: 'RUNNING' }]); // execution insert
      mockRunCertExamGenerator.mockResolvedValue({ items: [], errors: [] });

      await service.generateItems(defaultOptions, 'user-1', 'tenant-1');

      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when execution insert fails', async () => {
      mockSelectLimit.mockResolvedValueOnce([{ id: 'agent-def-1' }]);
      mockReturning.mockResolvedValueOnce([]); // empty — no execution created

      await expect(
        service.generateItems(defaultOptions, 'user-1', 'tenant-1')
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('throws when consent check fails', async () => {
      mockAssertConsent.mockRejectedValueOnce(new Error('CONSENT_REQUIRED'));

      await expect(
        service.generateItems(defaultOptions, 'user-1', 'tenant-1')
      ).rejects.toThrow('CONSENT_REQUIRED');
    });
  });

  // ── getResult ─────────────────────────────────────────────────────────────

  describe('getResult', () => {
    it('returns execution record with item count', async () => {
      mockSelectLimit.mockResolvedValueOnce([
        {
          id: 'exec-1',
          status: 'COMPLETED',
          output: { items: [{ id: 'q1' }, { id: 'q2' }] },
        },
      ]);

      const result = await service.getResult('exec-1');

      expect(result).toEqual({
        executionId: 'exec-1',
        status: 'COMPLETED',
        itemCount: 2,
      });
    });

    it('returns null when execution not found', async () => {
      mockSelectLimit.mockResolvedValueOnce([]);

      const result = await service.getResult('missing');

      expect(result).toBeNull();
    });

    it('returns itemCount 0 when output has no items', async () => {
      mockSelectLimit.mockResolvedValueOnce([
        { id: 'exec-1', status: 'FAILED', output: { error: 'timeout' } },
      ]);

      const result = await service.getResult('exec-1');

      expect(result).toEqual({
        executionId: 'exec-1',
        status: 'FAILED',
        itemCount: 0,
      });
    });

    it('returns itemCount 0 when output is null', async () => {
      mockSelectLimit.mockResolvedValueOnce([
        { id: 'exec-1', status: 'RUNNING', output: null },
      ]);

      const result = await service.getResult('exec-1');

      expect(result).toEqual({
        executionId: 'exec-1',
        status: 'RUNNING',
        itemCount: 0,
      });
    });
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
