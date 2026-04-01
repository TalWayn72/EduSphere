import { describe, it, expect } from 'vitest';
import {
  ADMIN_NOTIFICATION_TEMPLATES_QUERY,
  UPDATE_NOTIFICATION_TEMPLATE_MUTATION,
  RESET_NOTIFICATION_TEMPLATE_MUTATION,
} from './admin-notifications.queries';

describe('admin-notifications.queries', () => {
  it('exports ADMIN_NOTIFICATION_TEMPLATES_QUERY as a query DocumentNode', () => {
    expect(ADMIN_NOTIFICATION_TEMPLATES_QUERY).toBeDefined();
    expect(ADMIN_NOTIFICATION_TEMPLATES_QUERY.kind).toBe('Document');
    expect(
      ADMIN_NOTIFICATION_TEMPLATES_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ADMIN_NOTIFICATION_TEMPLATES_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AdminNotificationTemplates');
  });

  it('exports UPDATE_NOTIFICATION_TEMPLATE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_NOTIFICATION_TEMPLATE_MUTATION).toBeDefined();
    expect(UPDATE_NOTIFICATION_TEMPLATE_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_NOTIFICATION_TEMPLATE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_NOTIFICATION_TEMPLATE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateNotificationTemplate');
  });

  it('exports RESET_NOTIFICATION_TEMPLATE_MUTATION as a mutation DocumentNode', () => {
    expect(RESET_NOTIFICATION_TEMPLATE_MUTATION).toBeDefined();
    expect(RESET_NOTIFICATION_TEMPLATE_MUTATION.kind).toBe('Document');
    expect(
      RESET_NOTIFICATION_TEMPLATE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = RESET_NOTIFICATION_TEMPLATE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ResetNotificationTemplate');
  });
});
