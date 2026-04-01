import { describe, it, expect } from 'vitest';
import {
  ROLE_FIELDS,
  LIST_ROLES_QUERY,
  GET_ROLE_QUERY,
  CREATE_ROLE_MUTATION,
  UPDATE_ROLE_MUTATION,
  DELETE_ROLE_MUTATION,
} from './admin-roles.queries';

describe('admin-roles.queries', () => {
  it('exports ROLE_FIELDS as a GraphQL fragment DocumentNode', () => {
    expect(ROLE_FIELDS).toBeDefined();
    expect(ROLE_FIELDS.kind).toBe('Document');
    expect(ROLE_FIELDS.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ROLE_FIELDS.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('FragmentDefinition');
    expect(def.name?.value).toBe('RoleFields');
  });

  it('exports LIST_ROLES_QUERY as a query DocumentNode', () => {
    expect(LIST_ROLES_QUERY).toBeDefined();
    expect(LIST_ROLES_QUERY.kind).toBe('Document');
    expect(LIST_ROLES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LIST_ROLES_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ListRoles');
  });

  it('exports GET_ROLE_QUERY as a query DocumentNode', () => {
    expect(GET_ROLE_QUERY).toBeDefined();
    expect(GET_ROLE_QUERY.kind).toBe('Document');
    expect(GET_ROLE_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GET_ROLE_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetRole');
  });

  it('exports CREATE_ROLE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_ROLE_MUTATION).toBeDefined();
    expect(CREATE_ROLE_MUTATION.kind).toBe('Document');
    expect(CREATE_ROLE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_ROLE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateRole');
  });

  it('exports UPDATE_ROLE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_ROLE_MUTATION).toBeDefined();
    expect(UPDATE_ROLE_MUTATION.kind).toBe('Document');
    expect(UPDATE_ROLE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_ROLE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateRole');
  });

  it('exports DELETE_ROLE_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_ROLE_MUTATION).toBeDefined();
    expect(DELETE_ROLE_MUTATION.kind).toBe('Document');
    expect(DELETE_ROLE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DELETE_ROLE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteRole');
  });
});
