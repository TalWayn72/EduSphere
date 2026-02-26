import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { UserFollowedPayload } from '@edusphere/nats-client';

const SUBJECT_USER_FOLLOWED = 'EDUSPHERE.user.followed';
const DEFAULT_LIMIT = 50;

@Injectable()
export class SocialService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('SocialService: NATS connected');
    } catch (err) {
      this.logger.warn(
        { err },
        'SocialService: NATS unavailable — events will be skipped'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  private tenantCtx(tenantId: string, userId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  async followUser(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx = this.tenantCtx(tenantId, followerId);
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .insert(schema.userFollows)
        .values({ followerId, followingId, tenantId })
        .onConflictDoNothing();
    });
    await this.publishFollowEvent(followerId, followingId, tenantId);
    return true;
  }

  async unfollowUser(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx = this.tenantCtx(tenantId, followerId);
    const result = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .delete(schema.userFollows)
        .where(
          and(
            eq(schema.userFollows.followerId, followerId),
            eq(schema.userFollows.followingId, followingId)
          )
        )
        .returning({ id: schema.userFollows.id });
    });
    return result.length > 0;
  }

  async getFollowers(userId: string, tenantId: string, limit = DEFAULT_LIMIT) {
    const ctx = this.tenantCtx(tenantId, userId);
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({ followerId: schema.userFollows.followerId })
        .from(schema.userFollows)
        .where(eq(schema.userFollows.followingId, userId))
        .limit(limit);
      return rows.map((r) => r.followerId);
    });
  }

  async getFollowing(userId: string, tenantId: string, limit = DEFAULT_LIMIT) {
    const ctx = this.tenantCtx(tenantId, userId);
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({ followingId: schema.userFollows.followingId })
        .from(schema.userFollows)
        .where(eq(schema.userFollows.followerId, userId))
        .limit(limit);
      return rows.map((r) => r.followingId);
    });
  }

  async isFollowing(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx = this.tenantCtx(tenantId, followerId);
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ id: schema.userFollows.id })
        .from(schema.userFollows)
        .where(
          and(
            eq(schema.userFollows.followerId, followerId),
            eq(schema.userFollows.followingId, followingId)
          )
        )
        .limit(1)
    );
    return rows.length > 0;
  }

  async getFollowersCount(userId: string, tenantId: string): Promise<number> {
    const followers = await this.getFollowers(userId, tenantId, 10000);
    return followers.length;
  }

  async getFollowingCount(userId: string, tenantId: string): Promise<number> {
    const following = await this.getFollowing(userId, tenantId, 10000);
    return following.length;
  }

  async getMutualFollowers(userId1: string, userId2: string, tenantId: string) {
    const [followers1, followers2] = await Promise.all([
      this.getFollowers(userId1, tenantId),
      this.getFollowers(userId2, tenantId),
    ]);
    const set2 = new Set(followers2);
    return followers1.filter((id) => set2.has(id));
  }

  private async publishFollowEvent(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<void> {
    if (!this.nats) return;
    try {
      const payload: UserFollowedPayload = {
        followerId,
        followingId,
        tenantId,
        timestamp: new Date().toISOString(),
      };
      this.nats.publish(
        SUBJECT_USER_FOLLOWED,
        new TextEncoder().encode(JSON.stringify(payload))
      );
    } catch (err) {
      this.logger.warn({ err }, 'Failed to publish user.followed event');
    }
  }
}
