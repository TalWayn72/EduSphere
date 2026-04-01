import { describe, it, expect } from 'vitest';
import {
  ADMIN_ANNOUNCEMENTS_QUERY,
  CREATE_ANNOUNCEMENT_MUTATION,
  UPDATE_ANNOUNCEMENT_MUTATION,
  DELETE_ANNOUNCEMENT_MUTATION,
  PUBLISH_ANNOUNCEMENT_MUTATION,
} from './announcements.queries';

describe('announcements.queries', () => {
  it('exports ADMIN_ANNOUNCEMENTS_QUERY as a query DocumentNode', () => {
    expect(ADMIN_ANNOUNCEMENTS_QUERY).toBeDefined();
    expect(ADMIN_ANNOUNCEMENTS_QUERY.kind).toBe('Document');
    expect(ADMIN_ANNOUNCEMENTS_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = ADMIN_ANNOUNCEMENTS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AdminAnnouncements');
  });

  it('exports CREATE_ANNOUNCEMENT_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_ANNOUNCEMENT_MUTATION).toBeDefined();
    expect(CREATE_ANNOUNCEMENT_MUTATION.kind).toBe('Document');
    expect(
      CREATE_ANNOUNCEMENT_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CREATE_ANNOUNCEMENT_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateAnnouncement');
  });

  it('exports UPDATE_ANNOUNCEMENT_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_ANNOUNCEMENT_MUTATION).toBeDefined();
    expect(UPDATE_ANNOUNCEMENT_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_ANNOUNCEMENT_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_ANNOUNCEMENT_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateAnnouncement');
  });

  it('exports DELETE_ANNOUNCEMENT_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_ANNOUNCEMENT_MUTATION).toBeDefined();
    expect(DELETE_ANNOUNCEMENT_MUTATION.kind).toBe('Document');
    expect(
      DELETE_ANNOUNCEMENT_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = DELETE_ANNOUNCEMENT_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteAnnouncement');
  });

  it('exports PUBLISH_ANNOUNCEMENT_MUTATION as a mutation DocumentNode', () => {
    expect(PUBLISH_ANNOUNCEMENT_MUTATION).toBeDefined();
    expect(PUBLISH_ANNOUNCEMENT_MUTATION.kind).toBe('Document');
    expect(
      PUBLISH_ANNOUNCEMENT_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = PUBLISH_ANNOUNCEMENT_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('PublishAnnouncement');
  });
});
