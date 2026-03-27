import { describe, it, expect } from 'vitest';
import { SCENARIO_TEMPLATES_QUERY, START_ROLEPLAY_MUTATION, SEND_ROLEPLAY_MESSAGE_MUTATION, MY_SCENARIO_SESSION_QUERY, CREATE_SCENARIO_TEMPLATE_MUTATION } from './roleplay.queries';

describe('roleplay.queries', () => {
  it('exports SCENARIO_TEMPLATES_QUERY as a query DocumentNode', () => {
    expect(SCENARIO_TEMPLATES_QUERY).toBeDefined();
    expect(SCENARIO_TEMPLATES_QUERY.kind).toBe('Document');
    expect(SCENARIO_TEMPLATES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SCENARIO_TEMPLATES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ScenarioTemplates');
  });

  it('exports START_ROLEPLAY_MUTATION as a mutation DocumentNode', () => {
    expect(START_ROLEPLAY_MUTATION).toBeDefined();
    expect(START_ROLEPLAY_MUTATION.kind).toBe('Document');
    expect(START_ROLEPLAY_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = START_ROLEPLAY_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('StartRoleplaySession');
  });

  it('exports SEND_ROLEPLAY_MESSAGE_MUTATION as a mutation DocumentNode', () => {
    expect(SEND_ROLEPLAY_MESSAGE_MUTATION).toBeDefined();
    expect(SEND_ROLEPLAY_MESSAGE_MUTATION.kind).toBe('Document');
    expect(SEND_ROLEPLAY_MESSAGE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEND_ROLEPLAY_MESSAGE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SendRoleplayMessage');
  });

  it('exports MY_SCENARIO_SESSION_QUERY as a query DocumentNode', () => {
    expect(MY_SCENARIO_SESSION_QUERY).toBeDefined();
    expect(MY_SCENARIO_SESSION_QUERY.kind).toBe('Document');
    expect(MY_SCENARIO_SESSION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_SCENARIO_SESSION_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyScenarioSession');
  });

  it('exports CREATE_SCENARIO_TEMPLATE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_SCENARIO_TEMPLATE_MUTATION).toBeDefined();
    expect(CREATE_SCENARIO_TEMPLATE_MUTATION.kind).toBe('Document');
    expect(CREATE_SCENARIO_TEMPLATE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_SCENARIO_TEMPLATE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateScenarioTemplate');
  });

});
