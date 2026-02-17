import { describe, it, expect, beforeEach } from 'vitest';
import { AnnotationService } from '../annotation.service';
import type { AuthContext } from '@edusphere/auth';

describe('AnnotationService', () => {
  let service: AnnotationService;

  beforeEach(() => {
    service = new AnnotationService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should require authentication for findById', async () => {
    await expect(
      service.findById('test-id', undefined)
    ).rejects.toThrow('Authentication required');
  });

  it('should require authentication for findAll', async () => {
    await expect(
      service.findAll(
        { limit: 10, offset: 0 },
        undefined
      )
    ).rejects.toThrow('Authentication required');
  });

  it('should require authentication for create', async () => {
    const mockAuthContext: AuthContext = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      roles: ['STUDENT'],
      tenantId: undefined, // Missing tenant
      isSuperAdmin: false,
    };

    await expect(
      service.create(
        {
          assetId: 'asset-123',
          annotationType: 'TEXT',
          layer: 'PERSONAL',
          content: { text: 'Test annotation' },
        },
        mockAuthContext
      )
    ).rejects.toThrow('Authentication required');
  });

  it('should require authentication for update', async () => {
    await expect(
      service.update(
        'annotation-123',
        { content: { text: 'Updated' } },
        undefined as any
      )
    ).rejects.toThrow('Authentication required');
  });

  it('should require authentication for delete', async () => {
    await expect(
      service.delete('annotation-123', undefined as any)
    ).rejects.toThrow('Authentication required');
  });
});
