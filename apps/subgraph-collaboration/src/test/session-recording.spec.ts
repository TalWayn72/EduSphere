import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';

// ── Mock DB setup for HocuspocusService ──────────────────────────────────────

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  schema: {
    collab_documents: {
      id: 'id',
      tenant_id: 'tenant_id',
      entity_type: 'entity_type',
      entity_id: 'entity_id',
      name: 'name',
      ydoc_snapshot: 'ydoc_snapshot',
    },
  },
  eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/auth', () => ({
  JWTValidator: class MockJWTValidator {
    validate = vi.fn().mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      roles: ['STUDENT'],
    });
  },
}));

vi.mock('@edusphere/config', () => ({
  keycloakConfig: {
    url: 'http://localhost:8080',
    realm: 'edusphere',
    clientId: 'edusphere-web',
  },
}));

// Mock the Hocuspocus Server so onModuleInit doesn't actually listen
vi.mock('@hocuspocus/server', () => ({
  Server: {
    configure: vi.fn(() => ({
      listen: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

import { HocuspocusService } from '../crdt/hocuspocus.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupSelectResult(result: unknown[]) {
  const limitFn = vi.fn(() => Promise.resolve(result));
  const whereObj = { limit: limitFn };
  mockFrom.mockReturnValue({ where: vi.fn(() => whereObj) });
  mockSelect.mockReturnValue({ from: mockFrom });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Session Recording — document snapshot persistence', () => {
  let service: HocuspocusService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HocuspocusService();
  });

  it('stores document snapshot as Yjs binary when saving (storeDocument path)', async () => {
    // Existing document in DB
    setupSelectResult([{ id: 'doc-1' }]);
    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockUpdate.mockReturnValue({ set: mockSet });

    const doc = new Y.Doc();
    const text = doc.getText('content');
    text.insert(0, 'Session transcript content');
    const snapshot = Buffer.from(Y.encodeStateAsUpdate(doc));

    // Access private method via prototype to test store logic
    const storeData = {
      documentName: 'discussion:session-123',
      document: doc,
      context: { authContext: { userId: 'user-1', tenantId: 'tenant-1' } },
    };

    // Call private storeDocument through the service prototype
    await (service as unknown as { storeDocument: (d: typeof storeData) => Promise<void> })
      .storeDocument(storeData);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ydoc_snapshot: expect.any(Buffer) })
    );
  });

  it('creates new document record when no existing snapshot found', async () => {
    setupSelectResult([]);
    const mockInsertValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });

    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'New recording');

    const storeData = {
      documentName: 'discussion:new-session-456',
      document: doc,
      context: { authContext: { userId: 'user-1', tenantId: 'tenant-1' } },
    };

    await (service as unknown as { storeDocument: (d: typeof storeData) => Promise<void> })
      .storeDocument(storeData);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'SHARED_CANVAS',
        entity_id: 'new-session-456',
        name: 'discussion:new-session-456',
        ydoc_snapshot: expect.any(Buffer),
      })
    );
  });

  it('loads existing document snapshot and applies Yjs update', async () => {
    // Create a known Yjs snapshot
    const originalDoc = new Y.Doc();
    originalDoc.getText('content').insert(0, 'Previously recorded content');
    const snapshot = Buffer.from(Y.encodeStateAsUpdate(originalDoc));

    setupSelectResult([{ ydoc_snapshot: snapshot }]);

    const loadDoc = new Y.Doc();
    const loadData = {
      documentName: 'discussion:session-789',
      document: loadDoc,
    };

    const resultDoc = await (service as unknown as { loadDocument: (d: typeof loadData) => Promise<Y.Doc> })
      .loadDocument(loadData);

    expect(resultDoc).toBe(loadDoc);
    expect(loadDoc.getText('content').toString()).toBe('Previously recorded content');
  });
});
