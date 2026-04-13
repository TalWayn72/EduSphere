/**
 * LiveReactionService — Reaction insert + 2-second burst aggregation via NATS.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  withTenantContext,
  closeAllPools,
  type Database,
  type TenantContext,
} from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { publishReactionBurst } from './nats-pubsub.helper';

interface BurstEntry {
  count: number;
  users: Set<string>;
  timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class LiveReactionService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveReactionService.name);
  private readonly db: Database;
  /** Map key: `<sessionId>:<emoji>` */
  private readonly burstBuffers = new Map<string, BurstEntry>();

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    // Flush all pending burst timers
    for (const [, entry] of this.burstBuffers) {
      clearTimeout(entry.timer);
    }
    this.burstBuffers.clear();
    await closeAllPools();
  }

  toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId ?? '',
      userId: authContext.userId,
      userRole: authContext.roles?.[0] ?? 'STUDENT',
    };
  }

  async sendReaction(
    sessionId: string,
    emoji: string,
    authContext: AuthContext,
    streamTs?: number
  ): Promise<boolean> {
    const tenantCtx = this.toTenantContext(authContext);

    await withTenantContext(this.db, tenantCtx, async (tx) => {
      const values: Record<string, unknown> = {
        session_id: sessionId,
        user_id: authContext.userId,
        tenant_id: tenantCtx.tenantId,
        emoji,
      };
      if (streamTs !== undefined) values['stream_ts'] = streamTs;

      await tx.insert(schema.live_reactions).values(values as never);
    });

    this.accumulateBurst(
      sessionId,
      emoji,
      authContext.userId,
      tenantCtx.tenantId
    );
    return true;
  }

  private accumulateBurst(
    sessionId: string,
    emoji: string,
    userId: string,
    tenantId: string
  ): void {
    const key = `${sessionId}:${emoji}`;
    const existing = this.burstBuffers.get(key);

    if (existing) {
      existing.count += 1;
      existing.users.add(userId);
    } else {
      const entry: BurstEntry = {
        count: 1,
        users: new Set([userId]),
        timer: setTimeout(() => {
          void this.flushBurst(key, sessionId, emoji, tenantId);
        }, 2000),
      };
      this.burstBuffers.set(key, entry);
    }
  }

  private async flushBurst(
    key: string,
    sessionId: string,
    emoji: string,
    tenantId: string
  ): Promise<void> {
    const entry = this.burstBuffers.get(key);
    if (!entry) return;
    this.burstBuffers.delete(key);

    const burst = {
      emoji,
      count: entry.count,
      recentUsers: [...entry.users].slice(0, 10),
    };

    this.logger.debug(
      `Reaction burst [${emoji}] session=${sessionId} count=${entry.count}`
    );

    await publishReactionBurst(sessionId, {
      sessionId,
      tenantId,
      emoji,
      count: entry.count,
      windowMs: 2000,
      timestamp: new Date().toISOString(),
      ...burst,
    });
  }
}
