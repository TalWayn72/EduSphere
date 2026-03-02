import * as SQLite from 'expo-sqlite';

export interface CachedQuery {
  id: string;
  query: string;
  variables: string;
  data: string;
  timestamp: number;
}

export interface OfflineMutation {
  id: string;
  mutation: string;
  variables: string;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  get pool(): SQLite.SQLiteDatabase | null {
    return this.db;
  }

  async runAsync(
    sql: string,
    args?: (string | number | null)[]
  ): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(sql, args ?? []);
  }

  async getAllAsync<T>(
    sql: string,
    args?: (string | number | null)[]
  ): Promise<T[]> {
    if (!this.db) return [];
    return this.db.getAllAsync<T>(sql, args ?? []);
  }

  async init() {
    this.db = await SQLite.openDatabaseAsync('edusphere.db');
    await this.createTables();
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_queries (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        variables TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_mutations (
        id TEXT PRIMARY KEY,
        mutation TEXT NOT NULL,
        variables TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        downloaded_at INTEGER NOT NULL,
        size INTEGER NOT NULL,
        lessons_count INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON cached_queries(timestamp);
      CREATE INDEX IF NOT EXISTS idx_status ON offline_mutations(status);
    `);
  }

  async cacheQuery(
    query: string,
    variables: Record<string, unknown>,
    data: unknown
  ): Promise<void> {
    if (!this.db) return;

    const id = this.generateId(query, variables);
    await this.db.runAsync(
      'INSERT OR REPLACE INTO cached_queries (id, query, variables, data, timestamp) VALUES (?, ?, ?, ?, ?)',
      [id, query, JSON.stringify(variables), JSON.stringify(data), Date.now()]
    );
  }

  async getCachedQuery(
    query: string,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.db) return null;

    const id = this.generateId(query, variables);
    const result = await this.db.getFirstAsync<CachedQuery>(
      'SELECT * FROM cached_queries WHERE id = ?',
      [id]
    );

    return result ? JSON.parse(result.data) : null;
  }

  async addOfflineMutation(
    mutation: string,
    variables: Record<string, unknown>
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Math.random().toString(36).substr(2, 9);
    await this.db.runAsync(
      'INSERT INTO offline_mutations (id, mutation, variables, timestamp, status) VALUES (?, ?, ?, ?, ?)',
      [id, mutation, JSON.stringify(variables), Date.now(), 'pending']
    );

    return id;
  }

  async getPendingMutations(): Promise<OfflineMutation[]> {
    if (!this.db) return [];

    const results = await this.db.getAllAsync<OfflineMutation>(
      'SELECT * FROM offline_mutations WHERE status = ? ORDER BY timestamp ASC',
      ['pending']
    );

    return results.map((row) => ({
      ...row,
      variables: JSON.parse(row.variables),
    }));
  }

  async updateMutationStatus(
    id: string,
    status: 'synced' | 'failed'
  ): Promise<void> {
    if (!this.db) return;

    await this.db.runAsync(
      'UPDATE offline_mutations SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return;

    const cutoff = Date.now() - maxAge;
    await this.db.runAsync('DELETE FROM cached_queries WHERE timestamp < ?', [
      cutoff,
    ]);
  }

  private generateId(
    query: string,
    variables: Record<string, unknown>
  ): string {
    return `${query}-${JSON.stringify(variables)}`;
  }
}

export const database = new DatabaseService();
