/**
 * Unit tests for CypherSourceService.
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

import { CypherSourceService } from './cypher-source.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const TENANT = 't-1';
const SOURCE = {
  id: 'src-1',
  tenant_id: TENANT,
  title: 'Guide for the Perplexed',
  type: 'BOOK',
  url: null,
};

describe('CypherSourceService', () => {
  let service: CypherSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CypherSourceService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('findSourceById returns the first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([SOURCE]);

    const result = await service.findSourceById('src-1', TENANT);

    expect(result).toEqual(SOURCE);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { id: 'src-1', tenantId: TENANT },
      TENANT
    );
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('findSourceById returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findSourceById('missing', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('createSource returns the created vertex from executeCypher', async () => {
    mockExecuteCypher.mockResolvedValue([SOURCE]);

    const result = await service.createSource(
      'Guide for the Perplexed',
      'BOOK',
      null,
      TENANT
    );

    expect(result).toEqual(SOURCE);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.stringContaining('CREATE'),
      expect.objectContaining({
        title: 'Guide for the Perplexed',
        type: 'BOOK',
        tenantId: TENANT,
      }),
      TENANT
    );
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('createSource passes null url coerced to null in params', async () => {
    mockExecuteCypher.mockResolvedValue([SOURCE]);

    await service.createSource('Title', 'BOOK', null, TENANT);

    const params = mockExecuteCypher.mock.calls[0]![3] as Record<
      string,
      unknown
    >;
    expect(params.url).toBeNull();
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('service instantiates without error', () => {
    expect(() => new CypherSourceService()).not.toThrow();
  });
});
