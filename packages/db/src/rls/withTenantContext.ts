import { sql } from 'drizzle-orm';
import { Histogram, Registry } from 'prom-client';
import type { DrizzleDB } from '../index';

// Lazily-initialised histogram — shared across all DB connections in this process.
// NestJS MetricsService registers its own copy; this provides a fallback for
// packages that call withTenantContext() outside of the NestJS container.
let _rlsHistogram: Histogram | null = null;
function getRlsHistogram(): Histogram {
  if (!_rlsHistogram) {
    _rlsHistogram = new Histogram({
      name: 'rls_policy_evaluation_duration_seconds',
      help: 'Row-Level Security withTenantContext evaluation duration',
      labelNames: ['operation'],
      buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [Registry.globalRegistry],
    });
  }
  return _rlsHistogram;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole:
    | 'SUPER_ADMIN'
    | 'ORG_ADMIN'
    | 'INSTRUCTOR'
    | 'STUDENT'
    | 'RESEARCHER';
}

/**
 * Execute database operation with tenant context (RLS enforcement)
 */
export async function withTenantContext<T>(
  db: DrizzleDB,
  context: TenantContext,
  operation: (db: DrizzleDB) => Promise<T>
): Promise<T> {
  const endTimer = getRlsHistogram().startTimer({ operation: 'query' });
  try {
    return await db.transaction(async (tx) => {
      // Set session variables for RLS policies.
      // SET LOCAL does not accept parameterized placeholders ($1) — use sql.raw() for literal values.
      const esc = (v: string) => v.replace(/'/g, "''");
      await tx.execute(
        sql.raw(`SET LOCAL app.current_tenant = '${esc(context.tenantId)}'`)
      );
      await tx.execute(
        sql.raw(`SET LOCAL app.current_user_id = '${esc(context.userId)}'`)
      );
      await tx.execute(
        sql.raw(`SET LOCAL app.current_user_role = '${esc(context.userRole)}'`)
      );

      // Execute operation with RLS context
      return operation(tx as any);
    });
  } finally {
    endTimer();
  }
}

/**
 * Execute operation bypassing RLS (admin only)
 */
export async function withBypassRLS<T>(
  db: DrizzleDB,
  operation: (db: DrizzleDB) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL row_security = OFF`);
    const result = await operation(tx as any);
    await tx.execute(sql`SET LOCAL row_security = ON`);
    return result;
  });
}
