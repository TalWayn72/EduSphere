import { describe, it, expect } from 'vitest';
import { MY_PORTAL_QUERY, PUBLIC_PORTAL_QUERY, SAVE_PORTAL_LAYOUT_MUTATION, PUBLISH_PORTAL_MUTATION, UNPUBLISH_PORTAL_MUTATION } from './portal.queries';

describe('portal.queries', () => {
  it('exports MY_PORTAL_QUERY as a query DocumentNode', () => {
    expect(MY_PORTAL_QUERY).toBeDefined();
    expect(MY_PORTAL_QUERY.kind).toBe('Document');
    expect(MY_PORTAL_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_PORTAL_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyPortal');
  });

  it('exports PUBLIC_PORTAL_QUERY as a query DocumentNode', () => {
    expect(PUBLIC_PORTAL_QUERY).toBeDefined();
    expect(PUBLIC_PORTAL_QUERY.kind).toBe('Document');
    expect(PUBLIC_PORTAL_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PUBLIC_PORTAL_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PublicPortal');
  });

  it('exports SAVE_PORTAL_LAYOUT_MUTATION as a mutation DocumentNode', () => {
    expect(SAVE_PORTAL_LAYOUT_MUTATION).toBeDefined();
    expect(SAVE_PORTAL_LAYOUT_MUTATION.kind).toBe('Document');
    expect(SAVE_PORTAL_LAYOUT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SAVE_PORTAL_LAYOUT_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SavePortalLayout');
  });

  it('exports PUBLISH_PORTAL_MUTATION as a mutation DocumentNode', () => {
    expect(PUBLISH_PORTAL_MUTATION).toBeDefined();
    expect(PUBLISH_PORTAL_MUTATION.kind).toBe('Document');
    expect(PUBLISH_PORTAL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PUBLISH_PORTAL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('PublishPortal');
  });

  it('exports UNPUBLISH_PORTAL_MUTATION as a mutation DocumentNode', () => {
    expect(UNPUBLISH_PORTAL_MUTATION).toBeDefined();
    expect(UNPUBLISH_PORTAL_MUTATION.kind).toBe('Document');
    expect(UNPUBLISH_PORTAL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UNPUBLISH_PORTAL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UnpublishPortal');
  });

});
