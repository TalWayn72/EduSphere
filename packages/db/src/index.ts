import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

// Create PostgreSQL connection pool
export function createDatabaseConnection(connectionString?: string) {
  const pool = new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return drizzle(pool, { schema });
}

// Export schema
export { schema };
export type Database = ReturnType<typeof createDatabaseConnection>;

// RLS Context Helper
export async function withTenantContext<T>(
  db: Database,
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  await db.execute(sql`SET LOCAL app.current_tenant = ${tenantId}`);
  const result = await callback();
  await db.execute(sql`RESET app.current_tenant`);
  return result;
}

// Re-export from drizzle
export { sql, eq, and, or, not } from 'drizzle-orm';
