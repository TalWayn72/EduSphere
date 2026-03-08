import { describe, it, expect } from 'vitest';
import {
  tenantAnalyticsSnapshots,
  analyticsSnapshotTypeEnum,
  tenantAnalyticsSnapshotsRLS,
  tenantAnalyticsSnapshotsIndexes,
} from './tenant-analytics-snapshots';
import {
  pushNotificationTokens,
  pushPlatformEnum,
  pushNotificationTokensRLS,
  pushNotificationTokensIndexes,
} from './push-notification-tokens';
import {
  userLearningVelocity,
  userLearningVelocityRLS,
  userLearningVelocityIndexes,
} from './user-learning-velocity';

describe('tenantAnalyticsSnapshots table', () => {
  it('is defined', () => {
    expect(tenantAnalyticsSnapshots).toBeDefined();
  });
  it('has id column', () => {
    expect(tenantAnalyticsSnapshots.id).toBeDefined();
  });
  it('has tenantId column', () => {
    expect(tenantAnalyticsSnapshots.tenantId).toBeDefined();
  });
  it('has snapshotDate column', () => {
    expect(tenantAnalyticsSnapshots.snapshotDate).toBeDefined();
  });
  it('has activeLearners column', () => {
    expect(tenantAnalyticsSnapshots.activeLearners).toBeDefined();
  });
  it('has completions column', () => {
    expect(tenantAnalyticsSnapshots.completions).toBeDefined();
  });
  it('has avgCompletionRate column', () => {
    expect(tenantAnalyticsSnapshots.avgCompletionRate).toBeDefined();
  });
  it('has totalLearningMinutes column', () => {
    expect(tenantAnalyticsSnapshots.totalLearningMinutes).toBeDefined();
  });
  it('has newEnrollments column', () => {
    expect(tenantAnalyticsSnapshots.newEnrollments).toBeDefined();
  });
  it('has snapshotType column', () => {
    expect(tenantAnalyticsSnapshots.snapshotType).toBeDefined();
  });
  it('has createdAt column', () => {
    expect(tenantAnalyticsSnapshots.createdAt).toBeDefined();
  });
  it('has correct column names', () => {
    const cols = Object.keys(tenantAnalyticsSnapshots);
    expect(cols).toContain('id');
    expect(cols).toContain('tenantId');
    expect(cols).toContain('snapshotDate');
    expect(cols).toContain('snapshotType');
  });
  it('analyticsSnapshotTypeEnum is defined', () => {
    expect(analyticsSnapshotTypeEnum).toBeDefined();
  });
  it('tenantAnalyticsSnapshotsRLS SQL is defined', () => {
    expect(tenantAnalyticsSnapshotsRLS).toBeDefined();
  });
  it('tenantAnalyticsSnapshotsIndexes SQL is defined', () => {
    expect(tenantAnalyticsSnapshotsIndexes).toBeDefined();
  });
});

describe('pushNotificationTokens table', () => {
  it('is defined', () => {
    expect(pushNotificationTokens).toBeDefined();
  });
  it('has id column', () => {
    expect(pushNotificationTokens.id).toBeDefined();
  });
  it('has userId column', () => {
    expect(pushNotificationTokens.userId).toBeDefined();
  });
  it('has tenantId column', () => {
    expect(pushNotificationTokens.tenantId).toBeDefined();
  });
  it('has token column', () => {
    expect(pushNotificationTokens.token).toBeDefined();
  });
  it('has platform column', () => {
    expect(pushNotificationTokens.platform).toBeDefined();
  });
  it('has expoPushToken column', () => {
    expect(pushNotificationTokens.expoPushToken).toBeDefined();
  });
  it('has webPushSubscription column', () => {
    expect(pushNotificationTokens.webPushSubscription).toBeDefined();
  });
  it('has lastSeenAt column', () => {
    expect(pushNotificationTokens.lastSeenAt).toBeDefined();
  });
  it('has createdAt column', () => {
    expect(pushNotificationTokens.createdAt).toBeDefined();
  });
  it('has correct column names', () => {
    const cols = Object.keys(pushNotificationTokens);
    expect(cols).toContain('id');
    expect(cols).toContain('userId');
    expect(cols).toContain('token');
    expect(cols).toContain('platform');
  });
  it('pushPlatformEnum is defined', () => {
    expect(pushPlatformEnum).toBeDefined();
  });
  it('pushNotificationTokensRLS SQL is defined', () => {
    expect(pushNotificationTokensRLS).toBeDefined();
  });
  it('pushNotificationTokensIndexes SQL is defined', () => {
    expect(pushNotificationTokensIndexes).toBeDefined();
  });
});

describe('userLearningVelocity table', () => {
  it('is defined', () => {
    expect(userLearningVelocity).toBeDefined();
  });
  it('has id column', () => {
    expect(userLearningVelocity.id).toBeDefined();
  });
  it('has userId column', () => {
    expect(userLearningVelocity.userId).toBeDefined();
  });
  it('has tenantId column', () => {
    expect(userLearningVelocity.tenantId).toBeDefined();
  });
  it('has weekStart column', () => {
    expect(userLearningVelocity.weekStart).toBeDefined();
  });
  it('has lessonsCompleted column', () => {
    expect(userLearningVelocity.lessonsCompleted).toBeDefined();
  });
  it('has minutesStudied column', () => {
    expect(userLearningVelocity.minutesStudied).toBeDefined();
  });
  it('has annotationsAdded column', () => {
    expect(userLearningVelocity.annotationsAdded).toBeDefined();
  });
  it('has createdAt column', () => {
    expect(userLearningVelocity.createdAt).toBeDefined();
  });
  it('has correct column names', () => {
    const cols = Object.keys(userLearningVelocity);
    expect(cols).toContain('id');
    expect(cols).toContain('userId');
    expect(cols).toContain('weekStart');
    expect(cols).toContain('tenantId');
  });
  it('userLearningVelocityRLS SQL is defined', () => {
    expect(userLearningVelocityRLS).toBeDefined();
  });
  it('userLearningVelocityIndexes SQL is defined', () => {
    expect(userLearningVelocityIndexes).toBeDefined();
  });
});
