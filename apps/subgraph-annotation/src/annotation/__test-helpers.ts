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
import type { SQLWrapper } from 'drizzle-orm';

/**
 * Resolve mocked DB helpers from the caller's vi.mock scope.
 * Dynamic import() is intercepted by vitest's module mock system,
 * unlike synchronous require() which may bypass it.
 */
async function getMockedDbHelpers() {
  const mod = await import('@edusphere/db');
  return {
    withTenantContext: mod.withTenantContext,
    schema: mod.schema,
    eq: mod.eq,
    and: mod.and,
    desc: mod.desc,
    sql: mod.sql,
  };
}

/**
 * Build the full Drizzle-style query chain on the mock tx,
 * mirroring what the real AnnotationQueriesService does.
 * This ensures tests that set up mockOffset/mockLimit/etc.
 * get their expected data returned through the chain.
 */
async function executeQueryChain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  conditions: unknown[],
  limit: number,
  offset: number
) {
  const { schema, and, desc } = await getMockedDbHelpers();
  return tx
    .select()
    .from(schema.annotations)
    .where(and(...(conditions as SQLWrapper[])))
    .orderBy(desc(schema.annotations.created_at))
    .limit(limit)
    .offset(offset);
}

export function createMockQueriesService(
  mockDb: unknown,
  _defaultResult: unknown[] = []
): AnnotationQueriesService {
  const authGuard = (auth?: AuthContext) => {
    if (!auth || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
  };
  const toCtx = (auth: AuthContext) => ({
    tenantId: auth.tenantId as string,
    userId: auth.userId,
    userRole: auth.roles[0] || 'STUDENT',
  });

  return {
    findAll: vi
      .fn()
      .mockImplementation(
        async (filters: Record<string, unknown>, auth?: AuthContext) => {
          authGuard(auth);
          const helpers = await getMockedDbHelpers();
          return helpers.withTenantContext(
            mockDb as never,
            toCtx(auth as AuthContext),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (tx: any) => {
              const { schema, eq, sql } = helpers;
              const conditions: unknown[] = [
                sql`${schema.annotations.deleted_at} IS NULL`,
              ];
              if (filters.assetId) {
                conditions.push(
                  eq(schema.annotations.asset_id, filters.assetId as string)
                );
              }
              if (filters.userId) {
                conditions.push(
                  eq(schema.annotations.user_id, filters.userId as string)
                );
              }
              if (filters.layer) {
                if (filters.layer === 'PERSONAL') {
                  conditions.push(
                    eq(schema.annotations.user_id, (auth as AuthContext).userId)
                  );
                }
                conditions.push(
                  sql`${schema.annotations.layer} = ${filters.layer}`
                );
              }
              return executeQueryChain(
                tx,
                mockDb,
                conditions,
                (filters.limit as number) || 10,
                (filters.offset as number) || 0
              );
            }
          );
        }
      ),
    findByAsset: vi
      .fn()
      .mockImplementation(
        async (
          assetId: string,
          layer: string | undefined,
          auth?: AuthContext
        ) => {
          authGuard(auth);
          const helpers = await getMockedDbHelpers();
          return helpers.withTenantContext(
            mockDb as never,
            toCtx(auth as AuthContext),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (tx: any) => {
              const { schema, eq, and, desc, sql } = helpers;
              const conditions: unknown[] = [
                eq(schema.annotations.asset_id, assetId),
                sql`${schema.annotations.deleted_at} IS NULL`,
              ];
              if (layer) {
                conditions.push(sql`${schema.annotations.layer} = ${layer}`);
              }
              return tx
                .select()
                .from(schema.annotations)
                .where(and(...(conditions as SQLWrapper[])))
                .orderBy(desc(schema.annotations.created_at));
            }
          );
        }
      ),
    findByUser: vi
      .fn()
      .mockImplementation(
        async (
          userId: string,
          limit: number,
          offset: number,
          auth?: AuthContext
        ) => {
          authGuard(auth);
          const helpers = await getMockedDbHelpers();
          return helpers.withTenantContext(
            mockDb as never,
            toCtx(auth as AuthContext),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (tx: any) => {
              const { schema, eq, sql } = helpers;
              const conditions = [
                eq(schema.annotations.user_id, userId),
                sql`${schema.annotations.deleted_at} IS NULL`,
              ];
              return executeQueryChain(tx, mockDb, conditions, limit, offset);
            }
          );
        }
      ),
    onModuleDestroy: vi.fn().mockResolvedValue(undefined),
  } as unknown as AnnotationQueriesService;
}
