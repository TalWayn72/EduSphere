import { describe, it, expect } from 'vitest';
import { DISCUSSIONS_QUERY, MY_DISCUSSIONS_QUERY, DISCUSSION_QUERY, CREATE_DISCUSSION_MUTATION, ADD_MESSAGE_MUTATION, JOIN_DISCUSSION_MUTATION, LEAVE_DISCUSSION_MUTATION, MESSAGE_ADDED_SUBSCRIPTION } from './collaboration.queries';

describe('collaboration.queries', () => {
  it('exports DISCUSSIONS_QUERY as a query DocumentNode', () => {
    expect(DISCUSSIONS_QUERY).toBeDefined();
    expect(DISCUSSIONS_QUERY.kind).toBe('Document');
    expect(DISCUSSIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DISCUSSIONS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Discussions');
  });

  it('exports MY_DISCUSSIONS_QUERY as a query DocumentNode', () => {
    expect(MY_DISCUSSIONS_QUERY).toBeDefined();
    expect(MY_DISCUSSIONS_QUERY.kind).toBe('Document');
    expect(MY_DISCUSSIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_DISCUSSIONS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyDiscussions');
  });

  it('exports DISCUSSION_QUERY as a query DocumentNode', () => {
    expect(DISCUSSION_QUERY).toBeDefined();
    expect(DISCUSSION_QUERY.kind).toBe('Document');
    expect(DISCUSSION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DISCUSSION_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Discussion');
  });

  it('exports CREATE_DISCUSSION_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_DISCUSSION_MUTATION).toBeDefined();
    expect(CREATE_DISCUSSION_MUTATION.kind).toBe('Document');
    expect(CREATE_DISCUSSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_DISCUSSION_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateDiscussion');
  });

  it('exports ADD_MESSAGE_MUTATION as a mutation DocumentNode', () => {
    expect(ADD_MESSAGE_MUTATION).toBeDefined();
    expect(ADD_MESSAGE_MUTATION.kind).toBe('Document');
    expect(ADD_MESSAGE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_MESSAGE_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddMessage');
  });

  it('exports JOIN_DISCUSSION_MUTATION as a mutation DocumentNode', () => {
    expect(JOIN_DISCUSSION_MUTATION).toBeDefined();
    expect(JOIN_DISCUSSION_MUTATION.kind).toBe('Document');
    expect(JOIN_DISCUSSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = JOIN_DISCUSSION_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('JoinDiscussion');
  });

  it('exports LEAVE_DISCUSSION_MUTATION as a mutation DocumentNode', () => {
    expect(LEAVE_DISCUSSION_MUTATION).toBeDefined();
    expect(LEAVE_DISCUSSION_MUTATION.kind).toBe('Document');
    expect(LEAVE_DISCUSSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LEAVE_DISCUSSION_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('LeaveDiscussion');
  });

  it('exports MESSAGE_ADDED_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(MESSAGE_ADDED_SUBSCRIPTION).toBeDefined();
    expect(MESSAGE_ADDED_SUBSCRIPTION.kind).toBe('Document');
    expect(MESSAGE_ADDED_SUBSCRIPTION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MESSAGE_ADDED_SUBSCRIPTION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('MessageAdded');
  });

});
