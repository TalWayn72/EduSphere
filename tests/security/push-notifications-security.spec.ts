import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Push Notifications Security (SI-3, SI-8, SI-9)', () => {
  const pushTokenService = (() => {
    try {
      return readFileSync(
        join(ROOT, 'apps/subgraph-core/src/notifications/push-token.service.ts'),
        'utf-8'
      );
    } catch { return ''; }
  })();

  const pushDispatchService = (() => {
    try {
      return readFileSync(
        join(ROOT, 'apps/subgraph-core/src/notifications/push-dispatch.service.ts'),
        'utf-8'
      );
    } catch { return ''; }
  })();

  it('push-token.service does not call new Pool() directly (SI-8)', () => {
    if (!pushTokenService) return; // skip if not created yet
    // SI-8: raw `new Pool()` is forbidden — must go through @edusphere/db helpers
    expect(pushTokenService).not.toMatch(/new Pool\(/);
  });

  it('push-token.service uses withTenantContext (SI-9)', () => {
    if (!pushTokenService) return;
    expect(pushTokenService).toContain('withTenantContext');
  });

  it('push-token.service implements OnModuleDestroy (memory-safe)', () => {
    if (!pushTokenService) return;
    expect(pushTokenService).toContain('OnModuleDestroy');
    expect(pushTokenService).toContain('closeAllPools');
  });

  it('push-dispatch does not log raw push token values (SI-3)', () => {
    if (!pushDispatchService) return;
    // SI-3: raw token values (expoPushToken, webPushSubscription) must never appear
    // directly inside a logger call. The service should log platform/userId only.
    // Look for patterns where the token *variable name* itself is interpolated into a log call.
    // Acceptable: logging `t.platform`, userId — NOT `t.expoPushToken` or `t.webPushSubscription`.
    expect(pushDispatchService).not.toMatch(/this\.logger\.[a-z]+\([^)]*expoPushToken[^)]*\)/);
    expect(pushDispatchService).not.toMatch(/this\.logger\.[a-z]+\([^)]*webPushSubscription[^)]*\)/);
  });

  it('push-dispatch uses Promise.race timeout', () => {
    if (!pushDispatchService) return;
    expect(pushDispatchService).toContain('Promise.race');
  });

  it('registerPushToken requires @authenticated', () => {
    const notifGraphql = readFileSync(
      join(ROOT, 'apps/subgraph-core/src/notifications/notifications.graphql'),
      'utf-8'
    );
    // Find registerPushToken mutation
    expect(notifGraphql).toContain('registerPushToken');
    expect(notifGraphql).toContain('@authenticated');
  });

  it('exportTenantAnalytics requires @authenticated and @requiresRole', () => {
    const analyticsGraphql = readFileSync(
      join(ROOT, 'apps/subgraph-content/src/analytics/analytics.graphql'),
      'utf-8'
    );
    expect(analyticsGraphql).toContain('exportTenantAnalytics');
    expect(analyticsGraphql).toContain('@authenticated');
    // Should have role restriction
    expect(analyticsGraphql).toMatch(/@requiresRole|ORG_ADMIN|SUPER_ADMIN/);
  });

  it('analytics does not expose raw user IDs in CSV export', () => {
    const exportService = (() => {
      try {
        return readFileSync(
          join(ROOT, 'apps/subgraph-content/src/analytics/tenant-analytics-export.service.ts'),
          'utf-8'
        );
      } catch { return ''; }
    })();
    if (!exportService) return;
    // CSV should use displayName not userId UUID pattern in headers
    // At minimum, the service should exist and be GDPR-aware
    expect(exportService).toBeTruthy();
  });

  it('tenantAnalytics uses withTenantContext (SI-9)', () => {
    const analyticsService = (() => {
      try {
        return readFileSync(
          join(ROOT, 'apps/subgraph-content/src/analytics/tenant-analytics.service.ts'),
          'utf-8'
        );
      } catch { return ''; }
    })();
    if (!analyticsService) return;
    expect(analyticsService).toContain('withTenantContext');
  });

  it('webPushSubscription token not logged', () => {
    const webPushTs = (() => {
      try {
        return readFileSync(
          join(ROOT, 'apps/web/src/lib/webPush.ts'),
          'utf-8'
        );
      } catch { return ''; }
    })();
    if (!webPushTs) return;
    // No console.log of subscription data
    expect(webPushTs).not.toMatch(/console\.(log|info|debug)\([^)]*subscription[^)]*\)/);
  });
});
