import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Drizzle instance
export const db = drizzle(pool, { schema });

// Export types
export type DrizzleDB = typeof db;

// Export schema
export * from './schema';

// Export graph utilities
export * from './graph';

// Export RLS utilities
export * from './rls';

// Cleanup
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
