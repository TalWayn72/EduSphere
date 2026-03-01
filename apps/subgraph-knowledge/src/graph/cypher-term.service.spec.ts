/**
 * Unit tests for CypherTermService.
 * Direct class instantiation — no NestJS TestingModule.
 * All @edusphere/db helpers are mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const mockExecuteCypher = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {},
  executeCypher: (...args: unknown[]) => mockExecuteCypher(...args),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { CypherTermService } from './cypher-term.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const TENANT = 't-1';
const TERM = {
  id: 'term-1',
  tenant_id: TENANT,
  name: 'Torah',
  definition: 'The five books of Moses',
};

describe('CypherTermService', () => {
  let service: CypherTermService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CypherTermService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('findTermById returns the first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([TERM]);

    const result = await service.findTermById('term-1', TENANT);

    expect(result).toEqual(TERM);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { id: 'term-1', tenantId: TENANT },
      TENANT
    );
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('findTermById returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findTermById('missing', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('findTermByName returns the first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([TERM]);

    const result = await service.findTermByName('Torah', TENANT);

    expect(result).toEqual(TERM);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { name: 'Torah', tenantId: TENANT },
      TENANT
    );
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('findTermByName returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findTermByName('Unknown', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('createTerm returns the created vertex from executeCypher', async () => {
    mockExecuteCypher.mockResolvedValue([TERM]);

    const result = await service.createTerm(
      'Torah',
      'The five books of Moses',
      TENANT
    );

    expect(result).toEqual(TERM);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.stringContaining('CREATE'),
      expect.objectContaining({
        name: 'Torah',
        definition: 'The five books of Moses',
        tenantId: TENANT,
      }),
      TENANT
    );
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('service instantiates without error', () => {
    expect(() => new CypherTermService()).not.toThrow();
  });
});
