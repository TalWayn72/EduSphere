import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollabDocumentResolver } from './collab-document.resolver';

const MOCK_RESULT = {
  id: 'doc-1',
  title: 'Test Document',
  sizeBytes: 1024,
  compactedAt: new Date('2026-03-30'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-03-30'),
};

describe('CollabDocumentResolver', () => {
  let resolver: CollabDocumentResolver;
  let mockService: {
    compactDocument: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      compactDocument: vi.fn().mockResolvedValue(MOCK_RESULT),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver = new CollabDocumentResolver(mockService as any);
  });

  it('compactCollabDocument calls service and returns result', async () => {
    const context = {
      req: {},
      authContext: {
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        username: 'testuser',
        roles: ['INSTRUCTOR'],
        scopes: [],
        isSuperAdmin: false,
      },
    };

    const result = await resolver.compactCollabDocument('doc-1', context);

    expect(result).toEqual(MOCK_RESULT);
    expect(mockService.compactDocument).toHaveBeenCalledWith('doc-1');
  });

  it('throws when unauthenticated', async () => {
    const context = { req: {} };

    await expect(
      resolver.compactCollabDocument('doc-1', context)
    ).rejects.toThrow('Unauthenticated');
  });

  it('propagates service errors', async () => {
    mockService.compactDocument.mockRejectedValueOnce(
      new Error('Document not-found not found')
    );

    const context = {
      req: {},
      authContext: {
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        username: 'testuser',
        roles: ['INSTRUCTOR'],
        scopes: [],
        isSuperAdmin: false,
      },
    };

    await expect(
      resolver.compactCollabDocument('not-found', context)
    ).rejects.toThrow('Document not-found not found');
  });
});
