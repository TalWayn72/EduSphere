/**
 * Shared test helpers for AnnotationService spec files.
 * Creates a mock AnnotationQueriesService that mimics auth checks
 * and calls withTenantContext (which is mocked by @edusphere/db mock).
 */
import { vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { AnnotationQueriesService } from './annotation-queries.service';
import type { AuthContext } from '@edusphere/auth';

export function createMockQueriesService(
  mockDb: unknown,
  defaultResult: unknown[] = []
): AnnotationQueriesService {
  const authGuard = (auth?: AuthContext) => {
    if (!auth || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
  };
  const toCtx = (auth: AuthContext) => ({
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.roles[0] || 'STUDENT',
  });

  return {
    findAll: vi
      .fn()
      .mockImplementation(
        async (
          _filters: Record<string, unknown>,
          auth?: AuthContext
        ) => {
          authGuard(auth);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { withTenantContext } = require('@edusphere/db');
          return withTenantContext(
            mockDb,
            toCtx(auth as AuthContext),
            async () => defaultResult
          );
        }
      ),
    findByAsset: vi
      .fn()
      .mockImplementation(
        async (
          _assetId: string,
          _layer: string | undefined,
          auth?: AuthContext
        ) => {
          authGuard(auth);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { withTenantContext } = require('@edusphere/db');
          return withTenantContext(
            mockDb,
            toCtx(auth as AuthContext),
            async () => defaultResult
          );
        }
      ),
    findByUser: vi
      .fn()
      .mockImplementation(
        async (
          _userId: string,
          _limit: number,
          _offset: number,
          auth?: AuthContext
        ) => {
          authGuard(auth);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { withTenantContext } = require('@edusphere/db');
          return withTenantContext(
            mockDb,
            toCtx(auth as AuthContext),
            async () => defaultResult
          );
        }
      ),
    onModuleDestroy: vi.fn().mockResolvedValue(undefined),
  } as unknown as AnnotationQueriesService;
}
