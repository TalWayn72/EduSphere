import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseFrontmatter, generateDocId, isoTimestamp, mapTypeToCollection } from '../src/embeddings.js';

// --- parseFrontmatter ---
describe('parseFrontmatter', () => {
  it('parses standard YAML frontmatter from markdown', () => {
    const md = '---\nname: Test Doc\ndescription: A test\ntype: project\n---\nBody content here';
    const result = parseFrontmatter(md);
    expect(result.frontmatter['name']).toBe('Test Doc');
    expect(result.frontmatter['description']).toBe('A test');
    expect(result.frontmatter['type']).toBe('project');
    expect(result.body).toBe('Body content here');
  });

  it('returns raw content as body when no frontmatter present', () => {
    const md = '# Just a heading\nSome content';
    const result = parseFrontmatter(md);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(md);
  });

  it('handles array syntax in frontmatter', () => {
    const md = '---\ntags: [a, b, c]\n---\nBody';
    const result = parseFrontmatter(md);
    expect(result.frontmatter['tags']).toEqual(['a', 'b', 'c']);
  });

  it('strips surrounding quotes from values', () => {
    const md = '---\nname: "Quoted Value"\n---\nBody';
    const result = parseFrontmatter(md);
    expect(result.frontmatter['name']).toBe('Quoted Value');
  });
});

// --- generateDocId ---
describe('generateDocId', () => {
  it('returns a valid UUID v4 string', () => {
    const id = generateDocId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('generates unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateDocId()));
    expect(ids.size).toBe(50);
  });
});

// --- isoTimestamp ---
describe('isoTimestamp', () => {
  it('returns a valid ISO 8601 string', () => {
    const ts = isoTimestamp();
    expect(() => new Date(ts)).not.toThrow();
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});

// --- mapTypeToCollection ---
describe('mapTypeToCollection', () => {
  it('maps user type to feedback collection', () => {
    expect(mapTypeToCollection('user')).toBe('edusphere_feedback');
  });

  it('maps feedback type to feedback collection', () => {
    expect(mapTypeToCollection('feedback')).toBe('edusphere_feedback');
  });

  it('maps project type to decisions collection', () => {
    expect(mapTypeToCollection('project')).toBe('edusphere_decisions');
  });

  it('maps reference type to decisions collection', () => {
    expect(mapTypeToCollection('reference')).toBe('edusphere_decisions');
  });

  it('maps bug type to bug_patterns collection', () => {
    expect(mapTypeToCollection('bug')).toBe('edusphere_bug_patterns');
  });

  it('maps code type to code_patterns collection', () => {
    expect(mapTypeToCollection('code')).toBe('edusphere_code_patterns');
  });

  it('maps agent type to agent_perf collection', () => {
    expect(mapTypeToCollection('agent')).toBe('edusphere_agent_perf');
  });

  it('defaults unknown types to decisions collection', () => {
    expect(mapTypeToCollection('unknown')).toBe('edusphere_decisions');
    expect(mapTypeToCollection('')).toBe('edusphere_decisions');
  });

  it('is case-insensitive', () => {
    expect(mapTypeToCollection('USER')).toBe('edusphere_feedback');
    expect(mapTypeToCollection('Bug')).toBe('edusphere_bug_patterns');
  });
});

// --- Store/Search with mocked ChromaDB ---
describe('storeDecision (mocked ChromaDB)', () => {
  const mockAdd = vi.fn().mockResolvedValue(undefined);
  const mockCollection = { add: mockAdd, count: vi.fn().mockResolvedValue(0) };

  beforeEach(() => {
    vi.resetModules();
    mockAdd.mockClear();
  });

  it('creates correct document structure', async () => {
    vi.doMock('../src/collections.js', () => ({
      getCollection: vi.fn().mockResolvedValue(mockCollection),
      COLLECTION_NAMES: ['edusphere_decisions'],
      listCollectionsWithCounts: vi.fn(),
      getClient: vi.fn(),
    }));

    const { storeDecision } = await import('../src/handlers.js');
    const result = await storeDecision({
      title: 'Use GraphQL',
      rationale: 'Better DX',
      alternatives: 'REST, gRPC',
      chosen: 'GraphQL',
      tags: ['arch', 'api'],
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.stored).toBe(true);
    expect(data.collection).toBe('edusphere_decisions');
    expect(mockAdd).toHaveBeenCalledOnce();

    const callArgs = mockAdd.mock.calls[0][0];
    expect(callArgs.documents[0]).toContain('Use GraphQL');
    expect(callArgs.documents[0]).toContain('Better DX');
    expect(callArgs.metadatas[0].type).toBe('decision');
    expect(callArgs.metadatas[0].tags).toBe('arch,api');
  });
});

describe('storeBugPattern (mocked ChromaDB)', () => {
  const mockAdd = vi.fn().mockResolvedValue(undefined);
  const mockCollection = { add: mockAdd };

  beforeEach(() => {
    vi.resetModules();
    mockAdd.mockClear();
  });

  it('includes files in metadata', async () => {
    vi.doMock('../src/collections.js', () => ({
      getCollection: vi.fn().mockResolvedValue(mockCollection),
      COLLECTION_NAMES: ['edusphere_bug_patterns'],
      listCollectionsWithCounts: vi.fn(),
      getClient: vi.fn(),
    }));

    const { storeBugPattern } = await import('../src/handlers.js');
    await storeBugPattern({
      error: 'RLS leak',
      root_cause: 'Missing tenant context',
      solution: 'Add withTenantContext wrapper',
      files: ['user.service.ts', 'auth.guard.ts'],
    });

    const meta = mockAdd.mock.calls[0][0].metadatas[0];
    expect(meta.files).toBe('user.service.ts,auth.guard.ts');
    expect(meta.type).toBe('bug');
  });
});
