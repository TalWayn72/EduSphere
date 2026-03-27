import { describe, it, expect } from 'vitest';
import { START_AGENT_SESSION_MUTATION, SEND_AGENT_MESSAGE_MUTATION, END_SESSION_MUTATION, AGENT_SESSION_QUERY, MY_SESSIONS_QUERY, AGENT_TEMPLATES_QUERY, MESSAGE_STREAM_SUBSCRIPTION, CREATE_AGENT_WORKFLOW_MUTATION } from './agent.queries';

describe('agent.queries', () => {
  it('exports START_AGENT_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(START_AGENT_SESSION_MUTATION).toBeDefined();
    expect(START_AGENT_SESSION_MUTATION.kind).toBe('Document');
    expect(START_AGENT_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = START_AGENT_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('StartAgentSession');
  });

  it('exports SEND_AGENT_MESSAGE_MUTATION as a mutation DocumentNode', () => {
    expect(SEND_AGENT_MESSAGE_MUTATION).toBeDefined();
    expect(SEND_AGENT_MESSAGE_MUTATION.kind).toBe('Document');
    expect(SEND_AGENT_MESSAGE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEND_AGENT_MESSAGE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SendAgentMessage');
  });

  it('exports END_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(END_SESSION_MUTATION).toBeDefined();
    expect(END_SESSION_MUTATION.kind).toBe('Document');
    expect(END_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = END_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('EndAgentSession');
  });

  it('exports AGENT_SESSION_QUERY as a query DocumentNode', () => {
    expect(AGENT_SESSION_QUERY).toBeDefined();
    expect(AGENT_SESSION_QUERY.kind).toBe('Document');
    expect(AGENT_SESSION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = AGENT_SESSION_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AgentSession');
  });

  it('exports MY_SESSIONS_QUERY as a query DocumentNode', () => {
    expect(MY_SESSIONS_QUERY).toBeDefined();
    expect(MY_SESSIONS_QUERY.kind).toBe('Document');
    expect(MY_SESSIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_SESSIONS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyAgentSessions');
  });

  it('exports AGENT_TEMPLATES_QUERY as a query DocumentNode', () => {
    expect(AGENT_TEMPLATES_QUERY).toBeDefined();
    expect(AGENT_TEMPLATES_QUERY.kind).toBe('Document');
    expect(AGENT_TEMPLATES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = AGENT_TEMPLATES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AgentTemplates');
  });

  it('exports MESSAGE_STREAM_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(MESSAGE_STREAM_SUBSCRIPTION).toBeDefined();
    expect(MESSAGE_STREAM_SUBSCRIPTION.kind).toBe('Document');
    expect(MESSAGE_STREAM_SUBSCRIPTION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MESSAGE_STREAM_SUBSCRIPTION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('MessageStream');
  });

  it('exports CREATE_AGENT_WORKFLOW_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_AGENT_WORKFLOW_MUTATION).toBeDefined();
    expect(CREATE_AGENT_WORKFLOW_MUTATION.kind).toBe('Document');
    expect(CREATE_AGENT_WORKFLOW_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_AGENT_WORKFLOW_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateAgentWorkflow');
  });

});
