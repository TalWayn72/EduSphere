/**
 * Shared test helpers for AnnotationService spec files.
 * Creates a mock AnnotationQueriesService that mimics auth checks
 * and invokes the mocked withTenantContext from the caller's vi.mock.
 *
 * Uses dynamic import() instead of require() so vitest's module
 * mock hoisting is respected across file boundaries.
 */
import { vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { AnnotationQueriesService } from './annotation-queries.service';
import type { AuthContext } from '@edusphere/auth';

/**
 * Resolve withTenantContext from the caller's vi.mock scope.
 * Dynamic import() is intercepted by vitest's module mock system,
 * unlike synchronous require() which may bypass it.
 */
async function getMockedWithTenantContext() {
  const mod = await import('@edusphere/db');
  return mod.withTenantContext;
}

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
        async (_filters: Record<string, unknown>, auth?: AuthContext) => {
          authGuard(auth);
          const withTenantContext = await getMockedWithTenantContext();
          return withTenantContext(
            mockDb as never,
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
          const withTenantContext = await getMockedWithTenantContext();
          return withTenantContext(
            mockDb as never,
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
          const withTenantContext = await getMockedWithTenantContext();
          return withTenantContext(
            mockDb as never,
            toCtx(auth as AuthContext),
            async () => defaultResult
          );
        }
      ),
    onModuleDestroy: vi.fn().mockResolvedValue(undefined),
  } as unknown as AnnotationQueriesService;
}
