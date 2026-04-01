/**
 * SocialService — Facade delegating to SocialFollowService and SocialFeedService.
 * Preserves the original public API for all existing imports.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { closeAllPools } from '@edusphere/db';
import type { UserFollowedPayload } from '@edusphere/nats-client';
import { SocialFollowService } from './social-follow.service';
import { SocialFeedService } from './social-feed.service';

const SUBJECT_USER_FOLLOWED = 'EDUSPHERE.user.followed';

export interface SocialFeedItemDto {
  id: string;
  tenantId: string;
  actorId: string;
  actorDisplayName: string;
  verb: string;
  objectType: string;
  objectId: string;
  objectTitle: string;
  createdAt: Date;
}

export interface SocialRecommendationDto {
  contentItemId: string;
  contentTitle: string;
  followersCount: number;
  isMutualFollower: boolean;
  lastActivity: Date;
}

export interface PublicProfileDto {
  id: string;
  displayName: string;
}

@Injectable()
export class SocialService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialService.name);
  private nats: NatsConnection | null = null;
  private readonly feedSubs: Subscription[] = [];

  constructor(
    private readonly followService: SocialFollowService,
    private readonly feedService: SocialFeedService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('SocialService: NATS connected');
      await this.feedService.registerFeedSubscriptions(this.nats, this.feedSubs);
    } catch (err) {
      this.logger.warn(
        { err },
        'SocialService: NATS unavailable — events will be skipped'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.feedSubs) {
      sub.unsubscribe();
    }
    this.feedSubs.length = 0;
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  // Follow operations
  async followUser(followerId: string, followingId: string, tenantId: string) {
    const result = await this.followService.followUser(followerId, followingId, tenantId);
    await this.publishFollowEvent(followerId, followingId, tenantId);
    return result;
  }

  async unfollowUser(followerId: string, followingId: string, tenantId: string) {
    return this.followService.unfollowUser(followerId, followingId, tenantId);
  }

  async getFollowers(userId: string, tenantId: string, limit?: number) {
    return this.followService.getFollowers(userId, tenantId, limit);
  }

  async getFollowing(userId: string, tenantId: string, limit?: number) {
    return this.followService.getFollowing(userId, tenantId, limit);
  }

  async isFollowing(followerId: string, followingId: string, tenantId: string) {
    return this.followService.isFollowing(followerId, followingId, tenantId);
  }

  async getFollowersCount(userId: string, tenantId: string) {
    return this.followService.getFollowersCount(userId, tenantId);
  }

  async getFollowingCount(userId: string, tenantId: string) {
    return this.followService.getFollowingCount(userId, tenantId);
  }

  async getMutualFollowers(userId1: string, userId2: string, tenantId: string) {
    return this.followService.getMutualFollowers(userId1, userId2, tenantId);
  }

  async searchUsers(query: string, tenantId: string, limit?: number) {
    return this.followService.searchUsers(query, tenantId, limit);
  }

  // Feed operations
  async getSocialFeed(userId: string, tenantId: string, limit?: number) {
    return this.feedService.getSocialFeed(userId, tenantId, limit);
  }

  async getSocialRecommendations(userId: string, tenantId: string, limit?: number) {
    return this.feedService.getSocialRecommendations(userId, tenantId, limit);
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
