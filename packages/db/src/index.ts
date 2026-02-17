import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
export { sql, eq, and, or, not, desc, asc, inArray } from 'drizzle-orm';

// Database connection helper
export function createDatabaseConnection(connectionString?: string) {
  const pool = new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  return drizzle(pool, { schema });
}

// Export schema
export { schema };
export * from './schema';

// Export types
export type Database = ReturnType<typeof createDatabaseConnection>;
export type DrizzleDB = Database;

// Default connection
export const db = createDatabaseConnection();

// Export graph utilities
export * from './graph';

// Export RLS utilities
export * from './rls';
