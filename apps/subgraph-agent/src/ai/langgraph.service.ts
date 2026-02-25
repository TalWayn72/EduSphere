import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import pg from 'pg';
import { LANGGRAPH_MAX_MEMORY_SESSIONS, LANGGRAPH_CLEANUP_INTERVAL_MS } from '../constants';

type Checkpointer = MemorySaver | PostgresSaver;

@Injectable()
export class LangGraphService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LangGraphService.name);
  private checkpointer: Checkpointer | null = null;
  private pool: pg.Pool | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  async onModuleInit(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pool = new pg.Pool({ connectionString: dbUrl, max: 3 });
        const saver = new PostgresSaver(this.pool);
        await saver.setup();
        this.checkpointer = saver;
        this.logger.log('LangGraph: using PostgresSaver for durable checkpointing');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`LangGraph: PostgresSaver init failed (${msg}), falling back to MemorySaver`);
        this.checkpointer = new MemorySaver();
        this.scheduleMemoryTrim();
      }
    } else {
      this.checkpointer = new MemorySaver();
      this.scheduleMemoryTrim();
    }
  }

  private scheduleMemoryTrim(): void {
    this.cleanupInterval = setInterval(() => {
      const saver = this.checkpointer;
      if (!(saver instanceof MemorySaver)) return;
      // Access internal storage — MemorySaver stores checkpoints in a Map
      const storage = (saver as unknown as { storage?: Map<string, unknown> }).storage;
      if (storage && storage.size > LANGGRAPH_MAX_MEMORY_SESSIONS) {
        const toDelete = storage.size - LANGGRAPH_MAX_MEMORY_SESSIONS;
        const keys = [...storage.keys()].slice(0, toDelete);
        keys.forEach((k) => storage.delete(k));
        this.logger.warn(
          `LangGraph MemorySaver: trimmed ${toDelete} old sessions (size was ${storage.size + toDelete})`,
        );
      }
    }, LANGGRAPH_CLEANUP_INTERVAL_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.pool !== null) {
      try {
        await this.pool.end();
        this.logger.log('LangGraph: PostgreSQL pool closed');
      } catch (err: unknown) {
        this.logger.error(`LangGraph: pool.end() failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      this.pool = null;
    }
    this.checkpointer = null;
  }

  getCheckpointer(): Checkpointer {
    if (!this.checkpointer) {
      throw new Error('LangGraphService not initialized — onModuleInit() has not been called');
    }
    return this.checkpointer;
  }
}
