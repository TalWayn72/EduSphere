/**
 * social-recommendations-aggregate.ts — pure aggregation helpers for social recommendations.
 * No DI — plain exported functions.
 */
import type { ActivityRow } from './social-recommendations-data.service';
import type { SocialRecommendation } from './social-recommendations.service';

const MUTUAL_WEIGHT_MULTIPLIER = 2;

export function aggregateActivity(
  rows: ActivityRow[],
  completedIds: Set<string>,
  mutualSet: Set<string>
): SocialRecommendation[] {
  const map = new Map<string, SocialRecommendation>();
  for (const row of rows) {
    if (completedIds.has(row.contentItemId)) continue;
    const existing = map.get(row.contentItemId);
    const isMutual = mutualSet.has(row.userId);
    if (!existing) {
      map.set(row.contentItemId, {
        contentItemId: row.contentItemId,
        contentTitle: row.contentTitle,
        followersCount: 1,
        isMutualFollower: isMutual,
        lastActivity: row.lastAccessedAt,
        weight: isMutual ? MUTUAL_WEIGHT_MULTIPLIER : 1,
      });
    } else {
      existing.followersCount += 1;
      existing.weight += isMutual ? MUTUAL_WEIGHT_MULTIPLIER : 1;
      if (isMutual) existing.isMutualFollower = true;
      if (row.lastAccessedAt > existing.lastActivity)
        existing.lastActivity = row.lastAccessedAt;
    }
  }
  return Array.from(map.values());
}
