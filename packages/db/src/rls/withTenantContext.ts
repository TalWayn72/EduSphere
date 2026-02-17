import { sql } from 'drizzle-orm';
import type { DrizzleDB } from '../index';

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER';
}

/**
 * Execute database operation with tenant context (RLS enforcement)
 */
export async function withTenantContext<T>(
  db: DrizzleDB,
  context: TenantContext,
  operation: (tx: DrizzleDB) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set session variables for RLS policies
    await tx.execute(sql`SET LOCAL app.current_tenant = ${context.tenantId}`);
    await tx.execute(sql`SET LOCAL app.current_user_id = ${context.userId}`);
    await tx.execute(sql`SET LOCAL app.current_user_role = ${context.userRole}`);

    // Execute operation with RLS context
    return operation(tx);
  });
}

/**
 * Execute operation bypassing RLS (admin only)
 */
export async function withBypassRLS<T>(
  db: DrizzleDB,
  operation: (tx: DrizzleDB) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL row_security = OFF`);
    const result = await operation(tx);
    await tx.execute(sql`SET LOCAL row_security = ON`);
    return result;
  });
}
