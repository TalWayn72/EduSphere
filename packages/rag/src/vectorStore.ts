import { Pool } from 'pg';

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  tenantId: string;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class PgVectorStore {
  private pool: Pool;
  private tableName: string;
  private dimensions: number;

  constructor(
    connectionString: string,
    tableName: string = 'vector_documents',
    dimensions: number = 768
  ) {
    this.pool = new Pool({ connectionString });
    this.tableName = tableName;
    this.dimensions = dimensions;
  }

  async initialize(): Promise<void> {
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(${this.dimensions}) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}',
        tenant_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create HNSW index for fast similarity search
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_embedding_idx
      ON ${this.tableName}
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);

    // Create index for tenant filtering
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_tenant_idx
      ON ${this.tableName} (tenant_id)
    `);
  }

  async addDocument(doc: VectorDocument): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${this.tableName} (id, content, embedding, metadata, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata,
         tenant_id = EXCLUDED.tenant_id`,
      [
        doc.id,
        doc.content,
        JSON.stringify(doc.embedding),
        JSON.stringify(doc.metadata),
        doc.tenantId,
      ]
    );
  }

  async addDocuments(docs: VectorDocument[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const doc of docs) {
        await client.query(
          `INSERT INTO ${this.tableName} (id, content, embedding, metadata, tenant_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             tenant_id = EXCLUDED.tenant_id`,
          [
            doc.id,
            doc.content,
            JSON.stringify(doc.embedding),
            JSON.stringify(doc.metadata),
            doc.tenantId,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async similaritySearch(
    embedding: number[],
    tenantId: string,
    limit: number = 10,
    similarityThreshold: number = 0.5
  ): Promise<SearchResult[]> {
    const result = await this.pool.query(
      `SELECT
         id,
         content,
         metadata,
         1 - (embedding <=> $1::vector) AS similarity
       FROM ${this.tableName}
       WHERE tenant_id = $2
         AND 1 - (embedding <=> $1::vector) >= $3
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      [JSON.stringify(embedding), tenantId, similarityThreshold, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.similarity),
    }));
  }

  async deleteDocument(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
  }

  async deleteByMetadata(
    metadata: Record<string, any>,
    tenantId: string
  ): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE metadata @> $1::jsonb AND tenant_id = $2`,
      [JSON.stringify(metadata), tenantId]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createVectorStore(
  connectionString: string,
  tableName?: string,
  dimensions?: number
): PgVectorStore {
  return new PgVectorStore(connectionString, tableName, dimensions);
}
