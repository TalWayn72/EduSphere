/**
 * Unit tests for CypherPersonService.
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

import { CypherPersonService } from './cypher-person.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const TENANT = 't-1';
const PERSON = {
  id: 'p-1',
  tenant_id: TENANT,
  name: 'Maimonides',
  bio: 'Medieval philosopher',
};

describe('CypherPersonService', () => {
  let service: CypherPersonService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CypherPersonService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('findPersonById returns the first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([PERSON]);

    const result = await service.findPersonById('p-1', TENANT);

    expect(result).toEqual(PERSON);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { id: 'p-1', tenantId: TENANT },
      TENANT
    );
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('findPersonById returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findPersonById('missing', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('findPersonByName returns the first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([PERSON]);

    const result = await service.findPersonByName('Maimonides', TENANT);

    expect(result).toEqual(PERSON);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { name: 'Maimonides', tenantId: TENANT },
      TENANT
    );
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('findPersonByName returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findPersonByName('Unknown', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('createPerson returns the created vertex from executeCypher', async () => {
    mockExecuteCypher.mockResolvedValue([PERSON]);

    const result = await service.createPerson('Maimonides', 'Bio', TENANT);

    expect(result).toEqual(PERSON);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.stringContaining('CREATE'),
      expect.objectContaining({ name: 'Maimonides', tenantId: TENANT }),
      TENANT
    );
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('createPerson passes null bio coerced to null in params', async () => {
    mockExecuteCypher.mockResolvedValue([PERSON]);

    await service.createPerson('Maimonides', null, TENANT);

    const params = mockExecuteCypher.mock.calls[0]![3] as Record<
      string,
      unknown
    >;
    expect(params.bio).toBeNull();
  });
});
