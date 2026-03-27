import { describe, it, expect } from 'vitest';
import { MY_NOTIFICATION_PREFERENCES_QUERY, UPDATE_NOTIFICATION_PREFERENCE_MUTATION, MY_NOTIFICATION_HISTORY_QUERY, NOTIFICATION_DELIVERY_ANALYTICS_QUERY, MARK_NOTIFICATION_READ_MUTATION, MARK_ALL_NOTIFICATIONS_READ_MUTATION } from './notification-preferences.queries';

describe('notification-preferences.queries', () => {
  it('exports MY_NOTIFICATION_PREFERENCES_QUERY as a query DocumentNode', () => {
    expect(MY_NOTIFICATION_PREFERENCES_QUERY).toBeDefined();
    expect(MY_NOTIFICATION_PREFERENCES_QUERY.kind).toBe('Document');
    expect(MY_NOTIFICATION_PREFERENCES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_NOTIFICATION_PREFERENCES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyNotificationPreferences');
  });

  it('exports UPDATE_NOTIFICATION_PREFERENCE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_NOTIFICATION_PREFERENCE_MUTATION).toBeDefined();
    expect(UPDATE_NOTIFICATION_PREFERENCE_MUTATION.kind).toBe('Document');
    expect(UPDATE_NOTIFICATION_PREFERENCE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_NOTIFICATION_PREFERENCE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateNotificationPreference');
  });

  it('exports MY_NOTIFICATION_HISTORY_QUERY as a query DocumentNode', () => {
    expect(MY_NOTIFICATION_HISTORY_QUERY).toBeDefined();
    expect(MY_NOTIFICATION_HISTORY_QUERY.kind).toBe('Document');
    expect(MY_NOTIFICATION_HISTORY_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_NOTIFICATION_HISTORY_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyNotificationHistory');
  });

  it('exports NOTIFICATION_DELIVERY_ANALYTICS_QUERY as a query DocumentNode', () => {
    expect(NOTIFICATION_DELIVERY_ANALYTICS_QUERY).toBeDefined();
    expect(NOTIFICATION_DELIVERY_ANALYTICS_QUERY.kind).toBe('Document');
    expect(NOTIFICATION_DELIVERY_ANALYTICS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = NOTIFICATION_DELIVERY_ANALYTICS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('NotificationDeliveryAnalytics');
  });

  it('exports MARK_NOTIFICATION_READ_MUTATION as a mutation DocumentNode', () => {
    expect(MARK_NOTIFICATION_READ_MUTATION).toBeDefined();
    expect(MARK_NOTIFICATION_READ_MUTATION.kind).toBe('Document');
    expect(MARK_NOTIFICATION_READ_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MARK_NOTIFICATION_READ_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('MarkNotificationDeliveryRead');
  });

  it('exports MARK_ALL_NOTIFICATIONS_READ_MUTATION as a mutation DocumentNode', () => {
    expect(MARK_ALL_NOTIFICATIONS_READ_MUTATION).toBeDefined();
    expect(MARK_ALL_NOTIFICATIONS_READ_MUTATION.kind).toBe('Document');
    expect(MARK_ALL_NOTIFICATIONS_READ_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MARK_ALL_NOTIFICATIONS_READ_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('MarkAllNotificationDeliveriesRead');
  });

});
