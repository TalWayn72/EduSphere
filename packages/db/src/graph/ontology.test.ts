import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findRelatedConcepts,
  findContradictions,
  findLearningPath,
  createRelationship,
} from './ontology';
import type { DrizzleDB } from './client';

// ---------------------------------------------------------------------------
// Mock executeCypher at the module level.
// IMPORTANT: The factory must use vi.fn() directly — no top-level variables
// referenced here because vi.mock() is hoisted before variable initialisation.
// ---------------------------------------------------------------------------

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    executeCypher: vi.fn(),
  };
});

// Import the mocked function AFTER vi.mock() so we get the mock instance.
import { executeCypher } from './client';

// Cast to vi mock type so we can call .mockResolvedValue() etc.
const mockExecuteCypher = vi.mocked(executeCypher);

function buildMockDb(): DrizzleDB {
  return {} as unknown as DrizzleDB;
}

// ---------------------------------------------------------------------------
// findRelatedConcepts
// ---------------------------------------------------------------------------

describe('findRelatedConcepts()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with conceptId and tenantId as params', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'concept-1', 'tenant-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ conceptId: 'concept-1', tenantId: 'tenant-1' })
    );
  });

  it('uses $conceptId and $tenantId placeholders in query (no raw interpolation)', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c-123', 'tenant-abc');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$conceptId');
    expect(query).toContain('$tenantId');
  });

  it('clamps maxDepth=0 to 1', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 0);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..1');
  });

  it('clamps maxDepth=15 to 10', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 15);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..10');
  });

  it('uses the provided valid maxDepth=3', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 3);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..3');
  });

  it('clamps limit=0 to 1', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 2, 0);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('LIMIT 1');
  });

  it('clamps limit=500 to 100', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 2, 500);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('LIMIT 100');
  });

  it('uses default depth=2 and limit=10', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..2');
    expect(query).toContain('LIMIT 10');
  });

  it('returns the rows from executeCypher', async () => {
    const rows = [{ name: 'Calculus', definition: 'Math' }];
    mockExecuteCypher.mockResolvedValueOnce(rows);
    const db = buildMockDb();
    const result = await findRelatedConcepts(db, 'c', 't');
    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// findContradictions
// ---------------------------------------------------------------------------

describe('findContradictions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with conceptId param', async () => {
    const db = buildMockDb();
    await findContradictions(db, 'concept-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ conceptId: 'concept-1' })
    );
  });

  it('uses $conceptId placeholder in query', async () => {
    const db = buildMockDb();
    await findContradictions(db, 'concept-xyz');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$conceptId');
  });

  it('query includes CONTRADICTS relationship type', async () => {
    const db = buildMockDb();
    await findContradictions(db, 'c');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('CONTRADICTS');
  });

  it('returns results from executeCypher', async () => {
    const rows = [{ name: 'Anti-concept', description: 'Contradicts' }];
    mockExecuteCypher.mockResolvedValueOnce(rows);
    const db = buildMockDb();
    const result = await findContradictions(db, 'c');
    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// findLearningPath
// ---------------------------------------------------------------------------

describe('findLearningPath()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with conceptId param', async () => {
    const db = buildMockDb();
    await findLearningPath(db, 'concept-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ conceptId: 'concept-1' })
    );
  });

  it('uses $conceptId placeholder in query', async () => {
    const db = buildMockDb();
    await findLearningPath(db, 'concept-abc');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$conceptId');
  });

  it('query includes PREREQUISITE_OF relationship type', async () => {
    const db = buildMockDb();
    await findLearningPath(db, 'c');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('PREREQUISITE_OF');
  });

  it('returns results from executeCypher', async () => {
    const rows = [{ path: ['Algebra', 'Calculus'] }];
    mockExecuteCypher.mockResolvedValueOnce(rows);
    const db = buildMockDb();
    const result = await findLearningPath(db, 'c');
    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// createRelationship
// ---------------------------------------------------------------------------

describe('createRelationship()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with fromConceptId and toConceptId params', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'from-1', 'to-2', 'RELATED_TO');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ fromConceptId: 'from-1', toConceptId: 'to-2' })
    );
  });

  it('uses $fromConceptId and $toConceptId in query (not raw interpolation)', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'f', 't', 'RELATED_TO');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$fromConceptId');
    expect(query).toContain('$toConceptId');
  });

  it('includes the relationship type in the CREATE clause', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'f', 't', 'CONTRADICTS');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('CONTRADICTS');
  });

  it('serialises relationship properties into the query', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'f', 't', 'RELATED_TO', {
      strength: 0.8,
      inferred: true,
    });
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('0.8');
    expect(query).toContain('true');
  });

  it('works without optional properties', async () => {
    const db = buildMockDb();
    await expect(
      createRelationship(db, 'f', 't', 'RELATED_TO')
    ).resolves.toBeUndefined();
  });
});
