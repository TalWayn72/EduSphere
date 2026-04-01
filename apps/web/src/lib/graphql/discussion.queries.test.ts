import { describe, it, expect } from 'vitest';
import {
  MY_DISCUSSIONS_QUERY,
  DISCUSSION_QUERY,
  DISCUSSION_MESSAGES_QUERY,
  ADD_MESSAGE_MUTATION,
  LIKE_MESSAGE_MUTATION,
  MESSAGE_ADDED_SUBSCRIPTION,
  JOIN_DISCUSSION_MUTATION,
} from './discussion.queries';

describe('discussion.queries', () => {
  it('exports MY_DISCUSSIONS_QUERY as a query DocumentNode', () => {
    expect(MY_DISCUSSIONS_QUERY).toBeDefined();
    expect(MY_DISCUSSIONS_QUERY.kind).toBe('Document');
    expect(MY_DISCUSSIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_DISCUSSIONS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyDiscussions');
  });

  it('exports DISCUSSION_QUERY as a query DocumentNode', () => {
    expect(DISCUSSION_QUERY).toBeDefined();
    expect(DISCUSSION_QUERY.kind).toBe('Document');
    expect(DISCUSSION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DISCUSSION_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Discussion');
  });

  it('exports DISCUSSION_MESSAGES_QUERY as a query DocumentNode', () => {
    expect(DISCUSSION_MESSAGES_QUERY).toBeDefined();
    expect(DISCUSSION_MESSAGES_QUERY.kind).toBe('Document');
    expect(DISCUSSION_MESSAGES_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = DISCUSSION_MESSAGES_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('DiscussionMessages');
  });

  it('exports ADD_MESSAGE_MUTATION as a mutation DocumentNode', () => {
    expect(ADD_MESSAGE_MUTATION).toBeDefined();
    expect(ADD_MESSAGE_MUTATION.kind).toBe('Document');
    expect(ADD_MESSAGE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_MESSAGE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddMessage');
  });

  it('exports LIKE_MESSAGE_MUTATION as a mutation DocumentNode', () => {
    expect(LIKE_MESSAGE_MUTATION).toBeDefined();
    expect(LIKE_MESSAGE_MUTATION.kind).toBe('Document');
    expect(LIKE_MESSAGE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LIKE_MESSAGE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('LikeMessage');
  });

  it('exports MESSAGE_ADDED_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(MESSAGE_ADDED_SUBSCRIPTION).toBeDefined();
    expect(MESSAGE_ADDED_SUBSCRIPTION.kind).toBe('Document');
    expect(
      MESSAGE_ADDED_SUBSCRIPTION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = MESSAGE_ADDED_SUBSCRIPTION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('MessageAdded');
  });

  it('exports JOIN_DISCUSSION_MUTATION as a mutation DocumentNode', () => {
    expect(JOIN_DISCUSSION_MUTATION).toBeDefined();
    expect(JOIN_DISCUSSION_MUTATION.kind).toBe('Document');
    expect(JOIN_DISCUSSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = JOIN_DISCUSSION_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('JoinDiscussion');
  });
});
