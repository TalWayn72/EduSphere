import { describe, it, expect } from 'vitest';
import { MY_TEAM_OVERVIEW_QUERY, ADD_TEAM_MEMBER_MUTATION, REMOVE_TEAM_MEMBER_MUTATION } from './manager.queries';

describe('manager.queries', () => {
  it('exports MY_TEAM_OVERVIEW_QUERY as a query DocumentNode', () => {
    expect(MY_TEAM_OVERVIEW_QUERY).toBeDefined();
    expect(MY_TEAM_OVERVIEW_QUERY.kind).toBe('Document');
    expect(MY_TEAM_OVERVIEW_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_TEAM_OVERVIEW_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyTeamOverview');
  });

  it('exports ADD_TEAM_MEMBER_MUTATION as a mutation DocumentNode', () => {
    expect(ADD_TEAM_MEMBER_MUTATION).toBeDefined();
    expect(ADD_TEAM_MEMBER_MUTATION.kind).toBe('Document');
    expect(ADD_TEAM_MEMBER_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_TEAM_MEMBER_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddTeamMember');
  });

  it('exports REMOVE_TEAM_MEMBER_MUTATION as a mutation DocumentNode', () => {
    expect(REMOVE_TEAM_MEMBER_MUTATION).toBeDefined();
    expect(REMOVE_TEAM_MEMBER_MUTATION.kind).toBe('Document');
    expect(REMOVE_TEAM_MEMBER_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REMOVE_TEAM_MEMBER_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RemoveTeamMember');
  });

});
