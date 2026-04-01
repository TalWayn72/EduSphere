/**
 * HNSW Index Migration Tests — Migration 0041
 *
 * Validates that the HNSW index migration SQL:
 * - Contains correct DROP INDEX IF EXISTS statements
 * - Creates indexes on all 4 embedding tables
 * - Uses optimized parameters (m=32, ef_construction=128)
 * - Uses vector_cosine_ops operator class
 * - Uses HNSW index method
 *
 * Note: CONCURRENTLY was intentionally removed for transactional
 * compatibility in the migration runner. Production rolling updates
 * should use the .sql.ref file with CONCURRENTLY outside a transaction.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '..',
  '0041_optimize_hnsw_indexes.sql'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

describe('Migration 0041 — Optimize HNSW Indexes', () => {
  it('migration file exists and is non-empty', () => {
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  describe('DROP INDEX statements', () => {
    const expectedDrops = [
      'idx_content_embeddings_hnsw',
      'idx_annotation_embeddings_hnsw',
      'idx_concept_embeddings_hnsw',
      'idx_exam_item_embeddings_hnsw',
    ];

    for (const indexName of expectedDrops) {
      it(`drops ${indexName}`, () => {
        const pattern = new RegExp(
          `DROP\\s+INDEX\\s+IF\\s+EXISTS\\s+${indexName}`,
          'i'
        );
        expect(migrationSql).toMatch(pattern);
      });
    }
  });

  describe('CREATE INDEX statements', () => {
    const expectedIndexes = [
      {
        index: 'idx_content_embeddings_hnsw',
        table: 'content_embeddings',
      },
      {
        index: 'idx_annotation_embeddings_hnsw',
        table: 'annotation_embeddings',
      },
      {
        index: 'idx_concept_embeddings_hnsw',
        table: 'concept_embeddings',
      },
      {
        index: 'idx_exam_item_embeddings_hnsw',
        table: 'exam_item_embeddings',
      },
    ];

    for (const { index, table } of expectedIndexes) {
      it(`creates ${index} on ${table}`, () => {
        // Match both direct CREATE INDEX and dynamic EXECUTE statements
        const directPattern = new RegExp(
          `CREATE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${index}\\s+ON\\s+${table}`,
          'i'
        );
        const dynamicPattern = new RegExp(
          `CREATE\\s+INDEX\\s+${index}[\\s\\S]*?ON\\s+${table}`,
          'i'
        );
        const matches =
          directPattern.test(migrationSql) || dynamicPattern.test(migrationSql);
        expect(matches).toBe(true);
      });
    }

    it('all indexes use vector_cosine_ops operator class', () => {
      // Count occurrences of vector_cosine_ops (4 indexes)
      const matches = migrationSql.match(/vector_cosine_ops/gi);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(4);
    });

    it('all indexes use HNSW method', () => {
      const matches = migrationSql.match(/using\s+hnsw/gi);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Optimized parameters', () => {
    it('uses m = 32 for all indexes', () => {
      const matches = migrationSql.match(/m\s*=\s*32/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(4);
    });

    it('uses ef_construction = 128 for all indexes', () => {
      const matches = migrationSql.match(/ef_construction\s*=\s*128/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Migration safety', () => {
    it('drops old indexes before creating new ones', () => {
      const firstDrop = migrationSql.indexOf('DROP INDEX');
      const firstCreate = migrationSql.indexOf('CREATE INDEX');
      expect(firstDrop).toBeLessThan(firstCreate);
    });

    it('creates exactly 4 indexes (one per embedding table)', () => {
      // 3 direct CREATE INDEX + 1 inside DO $$ EXECUTE block
      const directCreates = migrationSql.match(
        /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/gi
      );
      const dynamicCreates = migrationSql.match(/EXECUTE\s+'CREATE\s+INDEX/gi);
      const total =
        (directCreates?.length ?? 0) + (dynamicCreates?.length ?? 0);
      expect(total).toBe(4);
    });

    it('drops exactly 4 indexes', () => {
      const drops = migrationSql.match(/DROP\s+INDEX/gi);
      expect(drops).toHaveLength(4);
    });
  });
});
