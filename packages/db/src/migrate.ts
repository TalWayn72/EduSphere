import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

/**
 * Custom SQL migrations runner.
 *
 * Drizzle's migrate() only handles files tracked in migrations/meta/_journal.json.
 * Migrations 0010–0012 in src/migrations/ are custom SQL files that augment the
 * Drizzle-generated set (tenant_themes, user_skill_mastery, live_sessions rename).
 * This function runs them idempotently using a dedicated tracking table.
 */
async function runCustomMigrations(pool: Pool): Promise<void> {
  const migrationsDir = join(__dirname, 'migrations');

  // Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Collect .sql files (exclude test files), sorted ascending
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Check if already applied
    const { rows } = await pool.query(
      'SELECT id FROM custom_migrations WHERE filename = $1',
      [file]
    );
    if (rows.length > 0) {
      process.stderr.write(`[migrate] custom: ${file} — already applied, skipping\n`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    process.stderr.write(`[migrate] custom: applying ${file}...\n`);
    await pool.query(sql);
    await pool.query('INSERT INTO custom_migrations (filename) VALUES ($1)', [file]);
    process.stderr.write(`[migrate] custom: ${file} — done\n`);
  }
}

async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere',
  });

  const db = drizzle(pool);

  process.stderr.write('[migrate] Running Drizzle-managed migrations...\n');
  await migrate(db, { migrationsFolder: './migrations' });
  process.stderr.write('[migrate] Drizzle migrations complete.\n');

  process.stderr.write('[migrate] Running custom SQL migrations (src/migrations/)...\n');
  await runCustomMigrations(pool);
  process.stderr.write('[migrate] Custom migrations complete.\n');

  await pool.end();
}

runMigrations().catch((error: unknown) => {
  process.stderr.write(`[migrate] FATAL: ${String(error)}\n`);
  process.exit(1);
});
