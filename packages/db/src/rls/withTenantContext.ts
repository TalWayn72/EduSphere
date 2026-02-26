import { sql } from 'drizzle-orm';
import type { DrizzleDB } from '../index';

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
  return db.transaction(async (tx) => {
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
