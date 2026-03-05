/**
 * SocialRecommendationsService — F-036 Social Content Recommendations.
 * Uses collaborative filtering on the social follow graph.
 *
 * Low-level data access (follows, progress, activity queries) lives in
 * SocialRecommendationsDataService.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { closeAllPools } from '@edusphere/db';
import { TIME } from '@edusphere/config';
import { toUserRole } from './graph-types';
import { SocialRecommendationsDataService } from './social-recommendations-data.service';
import { aggregateActivity } from './social-recommendations-aggregate';

export interface SocialRecommendation {
  contentItemId: string;
  contentTitle: string;
  followersCount: number;
  isMutualFollower: boolean;
  lastActivity: Date;
  weight: number;
}

export interface SocialFeedItem {
  userId: string;
  userDisplayName: string;
  action: 'started' | 'completed' | 'progressed';
  contentItemId: string;
  contentTitle: string;
  timestamp: Date;
}


@Injectable()
export class SocialRecommendationsService implements OnModuleDestroy {
  private readonly logger = new Logger(SocialRecommendationsService.name);

  constructor(private readonly data: SocialRecommendationsDataService) {}

  async getRecommendations(
    userId: string,
    tenantId: string,
    limit = 10
  ): Promise<SocialRecommendation[]> {
    const ctx = { tenantId, userId, userRole: toUserRole('STUDENT') };

    const followedIds = await this.data.getFollowedUserIds(
      userId,
      tenantId,
      ctx
    );
    if (followedIds.length === 0) return [];

    const mutualIds = await this.data.getMutualFollowerIds(
      userId,
      tenantId,
      followedIds,
      ctx
    );
    const mutualSet = new Set(mutualIds);

    const completedIds = await this.data.getCompletedContentIds(userId, ctx);

    const cutoff = new Date(Date.now() - TIME.THIRTY_DAYS_MS);
    const activityRows = await this.data.getFollowedActivity(
      followedIds,
      cutoff,
      ctx
    );

    const aggregated = aggregateActivity(
      activityRows,
      completedIds,
      mutualSet
    );

    const ranked = aggregated
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);

    this.logger.debug(
      { userId, followedCount: followedIds.length, ranked: ranked.length },
      'socialRecommendations computed'
    );
    return ranked;
  }

  async getSocialFeed(
    userId: string,
    tenantId: string,
    limit = 20
  ): Promise<SocialFeedItem[]> {
    const ctx = { tenantId, userId, userRole: toUserRole('STUDENT') };
    const followedIds = await this.data.getFollowedUserIds(
      userId,
      tenantId,
      ctx
    );
    if (followedIds.length === 0) return [];

    const cutoff = new Date(Date.now() - TIME.SEVEN_DAYS_MS);
    const rows = await this.data.getSocialFeedRows(
      followedIds,
      cutoff,
      limit,
      ctx
    );

    return rows.map((r) => ({
      userId: r.user_id,
      userDisplayName: r.display_name,
      action: r.is_completed
        ? 'completed'
        : r.progress > 0
          ? 'progressed'
          : 'started',
      contentItemId: r.content_item_id,
      contentTitle: r.content_title,
      timestamp: new Date(r.last_accessed_at),
    }));
  }

  onModuleDestroy(): void {
    closeAllPools().catch((err) =>
      this.logger.error({ err }, 'closeAllPools error on destroy')
    );
  }

}
