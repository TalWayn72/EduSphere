import { describe, it, expect } from 'vitest';
import { NOTIFICATION_RECEIVED_SUBSCRIPTION } from './notifications.subscriptions';

describe('notifications.subscriptions', () => {
  it('exports NOTIFICATION_RECEIVED_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(NOTIFICATION_RECEIVED_SUBSCRIPTION).toBeDefined();
    expect(NOTIFICATION_RECEIVED_SUBSCRIPTION.kind).toBe('Document');
    expect(NOTIFICATION_RECEIVED_SUBSCRIPTION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = NOTIFICATION_RECEIVED_SUBSCRIPTION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('NotificationReceived');
  });

});
