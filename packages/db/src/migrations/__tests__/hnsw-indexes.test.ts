/**
 * HNSW Index Migration Tests — Migration 0041
 *
 * Validates that the HNSW index migration SQL:
 * - Contains correct DROP INDEX CONCURRENTLY statements
 * - Creates indexes on all 4 embedding tables
 * - Uses optimized parameters (m=32, ef_construction=128)
 * - Uses vector_cosine_ops operator class
 * - Uses CONCURRENTLY keyword for non-blocking operations
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '..',
  '0041_optimize_hnsw_indexes.sql',
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
      it(`drops ${indexName} CONCURRENTLY`, () => {
        const pattern = new RegExp(
          `DROP\\s+INDEX\\s+CONCURRENTLY\\s+IF\\s+EXISTS\\s+${indexName}`,
          'i',
        );
        expect(migrationSql).toMatch(pattern);
      });
    }
  });

  describe('CREATE INDEX statements', () => {
    const expectedTables = [
      { index: 'idx_content_embeddings_hnsw', table: 'content_embeddings' },
      {
        index: 'idx_annotation_embeddings_hnsw',
        table: 'annotation_embeddings',
      },
      { index: 'idx_concept_embeddings_hnsw', table: 'concept_embeddings' },
      {
        index: 'idx_exam_item_embeddings_hnsw',
        table: 'exam_item_embeddings',
      },
    ];

    for (const { index, table } of expectedTables) {
      it(`creates ${index} on ${table}`, () => {
        const pattern = new RegExp(
          `CREATE\\s+INDEX\\s+CONCURRENTLY\\s+IF\\s+NOT\\s+EXISTS\\s+${index}\\s+ON\\s+${table}`,
          'i',
        );
        expect(migrationSql).toMatch(pattern);
      });
    }

    it('all CREATE INDEX use CONCURRENTLY to avoid blocking', () => {
      const createStatements = migrationSql.match(
        /CREATE\s+INDEX\s+.*?;/gis,
      );
      expect(createStatements).not.toBeNull();
      for (const stmt of createStatements!) {
        expect(stmt.toUpperCase()).toContain('CONCURRENTLY');
      }
    });

    it('all indexes use vector_cosine_ops operator class', () => {
      const createStatements = migrationSql.match(
        /CREATE\s+INDEX\s+.*?;/gis,
      );
      expect(createStatements).not.toBeNull();
      for (const stmt of createStatements!) {
        expect(stmt).toContain('vector_cosine_ops');
      }
    });

    it('all indexes use HNSW method', () => {
      const createStatements = migrationSql.match(
        /CREATE\s+INDEX\s+.*?;/gis,
      );
      expect(createStatements).not.toBeNull();
      for (const stmt of createStatements!) {
        expect(stmt.toLowerCase()).toContain('using hnsw');
      }
    });
  });

  describe('Optimized parameters', () => {
    it('uses m = 32 for all indexes', () => {
      const createStatements = migrationSql.match(
        /CREATE\s+INDEX\s+.*?;/gis,
      );
      expect(createStatements).not.toBeNull();
      for (const stmt of createStatements!) {
        expect(stmt).toMatch(/m\s*=\s*32/);
      }
    });

    it('uses ef_construction = 128 for all indexes', () => {
      const createStatements = migrationSql.match(
        /CREATE\s+INDEX\s+.*?;/gis,
      );
      expect(createStatements).not.toBeNull();
      for (const stmt of createStatements!) {
        expect(stmt).toMatch(/ef_construction\s*=\s*128/);
      }
    });
  });

  describe('Migration safety', () => {
    it('drops old indexes before creating new ones', () => {
      const firstDrop = migrationSql.indexOf('DROP INDEX');
      const firstCreate = migrationSql.indexOf('CREATE INDEX');
      expect(firstDrop).toBeLessThan(firstCreate);
    });

    it('creates exactly 4 indexes (one per embedding table)', () => {
      const creates = migrationSql.match(/CREATE\s+INDEX/gi);
      expect(creates).toHaveLength(4);
    });

    it('drops exactly 4 indexes', () => {
      const drops = migrationSql.match(/DROP\s+INDEX/gi);
      expect(drops).toHaveLength(4);
    });
  });
});
