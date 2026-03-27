import { describe, it, expect } from 'vitest';
import { CRM_CONNECTION_QUERY, CRM_SYNC_LOG_QUERY, DISCONNECT_CRM_MUTATION } from './crm.queries';

describe('crm.queries', () => {
  it('exports CRM_CONNECTION_QUERY as a query DocumentNode', () => {
    expect(CRM_CONNECTION_QUERY).toBeDefined();
    expect(CRM_CONNECTION_QUERY.kind).toBe('Document');
    expect(CRM_CONNECTION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CRM_CONNECTION_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CrmConnection');
  });

  it('exports CRM_SYNC_LOG_QUERY as a query DocumentNode', () => {
    expect(CRM_SYNC_LOG_QUERY).toBeDefined();
    expect(CRM_SYNC_LOG_QUERY.kind).toBe('Document');
    expect(CRM_SYNC_LOG_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CRM_SYNC_LOG_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CrmSyncLog');
  });

  it('exports DISCONNECT_CRM_MUTATION as a mutation DocumentNode', () => {
    expect(DISCONNECT_CRM_MUTATION).toBeDefined();
    expect(DISCONNECT_CRM_MUTATION.kind).toBe('Document');
    expect(DISCONNECT_CRM_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DISCONNECT_CRM_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DisconnectCrm');
  });

});
