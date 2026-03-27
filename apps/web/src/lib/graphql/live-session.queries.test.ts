import { describe, it, expect } from 'vitest';
import { LIST_LIVE_SESSIONS_QUERY, LIVE_SESSION_QUERY, GET_LIVE_SESSION_QUERY, CREATE_LIVE_SESSION_MUTATION, JOIN_LIVE_SESSION_MUTATION, START_LIVE_SESSION_MUTATION, CANCEL_LIVE_SESSION_MUTATION, END_LIVE_SESSION_MUTATION, SESSION_POLLS_QUERY, POLL_RESULTS_QUERY, CREATE_POLL_MUTATION, ACTIVATE_POLL_MUTATION, CLOSE_POLL_MUTATION, VOTE_POLL_MUTATION, POLL_UPDATED_SUBSCRIPTION, BREAKOUT_ROOMS_QUERY, CREATE_BREAKOUT_ROOMS_MUTATION } from './live-session.queries';

describe('live-session.queries', () => {
  it('exports LIST_LIVE_SESSIONS_QUERY as a query DocumentNode', () => {
    expect(LIST_LIVE_SESSIONS_QUERY).toBeDefined();
    expect(LIST_LIVE_SESSIONS_QUERY.kind).toBe('Document');
    expect(LIST_LIVE_SESSIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LIST_LIVE_SESSIONS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ListLiveSessions');
  });

  it('exports LIVE_SESSION_QUERY as a query DocumentNode', () => {
    expect(LIVE_SESSION_QUERY).toBeDefined();
    expect(LIVE_SESSION_QUERY.kind).toBe('Document');
    expect(LIVE_SESSION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LIVE_SESSION_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('LiveSession');
  });

  it('exports GET_LIVE_SESSION_QUERY as a query DocumentNode', () => {
    expect(GET_LIVE_SESSION_QUERY).toBeDefined();
    expect(GET_LIVE_SESSION_QUERY.kind).toBe('Document');
    expect(GET_LIVE_SESSION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GET_LIVE_SESSION_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetLiveSession');
  });

  it('exports CREATE_LIVE_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_LIVE_SESSION_MUTATION).toBeDefined();
    expect(CREATE_LIVE_SESSION_MUTATION.kind).toBe('Document');
    expect(CREATE_LIVE_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_LIVE_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateLiveSession');
  });

  it('exports JOIN_LIVE_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(JOIN_LIVE_SESSION_MUTATION).toBeDefined();
    expect(JOIN_LIVE_SESSION_MUTATION.kind).toBe('Document');
    expect(JOIN_LIVE_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = JOIN_LIVE_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('JoinLiveSession');
  });

  it('exports START_LIVE_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(START_LIVE_SESSION_MUTATION).toBeDefined();
    expect(START_LIVE_SESSION_MUTATION.kind).toBe('Document');
    expect(START_LIVE_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = START_LIVE_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('StartLiveSession');
  });

  it('exports CANCEL_LIVE_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(CANCEL_LIVE_SESSION_MUTATION).toBeDefined();
    expect(CANCEL_LIVE_SESSION_MUTATION.kind).toBe('Document');
    expect(CANCEL_LIVE_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CANCEL_LIVE_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CancelLiveSession');
  });

  it('exports END_LIVE_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(END_LIVE_SESSION_MUTATION).toBeDefined();
    expect(END_LIVE_SESSION_MUTATION.kind).toBe('Document');
    expect(END_LIVE_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = END_LIVE_SESSION_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('EndLiveSession');
  });

  it('exports SESSION_POLLS_QUERY as a query DocumentNode', () => {
    expect(SESSION_POLLS_QUERY).toBeDefined();
    expect(SESSION_POLLS_QUERY.kind).toBe('Document');
    expect(SESSION_POLLS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SESSION_POLLS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SessionPolls');
  });

  it('exports POLL_RESULTS_QUERY as a query DocumentNode', () => {
    expect(POLL_RESULTS_QUERY).toBeDefined();
    expect(POLL_RESULTS_QUERY.kind).toBe('Document');
    expect(POLL_RESULTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = POLL_RESULTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PollResults');
  });

  it('exports CREATE_POLL_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_POLL_MUTATION).toBeDefined();
    expect(CREATE_POLL_MUTATION.kind).toBe('Document');
    expect(CREATE_POLL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_POLL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreatePoll');
  });

  it('exports ACTIVATE_POLL_MUTATION as a mutation DocumentNode', () => {
    expect(ACTIVATE_POLL_MUTATION).toBeDefined();
    expect(ACTIVATE_POLL_MUTATION.kind).toBe('Document');
    expect(ACTIVATE_POLL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ACTIVATE_POLL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ActivatePoll');
  });

  it('exports CLOSE_POLL_MUTATION as a mutation DocumentNode', () => {
    expect(CLOSE_POLL_MUTATION).toBeDefined();
    expect(CLOSE_POLL_MUTATION.kind).toBe('Document');
    expect(CLOSE_POLL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CLOSE_POLL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ClosePoll');
  });

  it('exports VOTE_POLL_MUTATION as a mutation DocumentNode', () => {
    expect(VOTE_POLL_MUTATION).toBeDefined();
    expect(VOTE_POLL_MUTATION.kind).toBe('Document');
    expect(VOTE_POLL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = VOTE_POLL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('VotePoll');
  });

  it('exports POLL_UPDATED_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(POLL_UPDATED_SUBSCRIPTION).toBeDefined();
    expect(POLL_UPDATED_SUBSCRIPTION.kind).toBe('Document');
    expect(POLL_UPDATED_SUBSCRIPTION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = POLL_UPDATED_SUBSCRIPTION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('PollUpdated');
  });

  it('exports BREAKOUT_ROOMS_QUERY as a query DocumentNode', () => {
    expect(BREAKOUT_ROOMS_QUERY).toBeDefined();
    expect(BREAKOUT_ROOMS_QUERY.kind).toBe('Document');
    expect(BREAKOUT_ROOMS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = BREAKOUT_ROOMS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('BreakoutRooms');
  });

  it('exports CREATE_BREAKOUT_ROOMS_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_BREAKOUT_ROOMS_MUTATION).toBeDefined();
    expect(CREATE_BREAKOUT_ROOMS_MUTATION.kind).toBe('Document');
    expect(CREATE_BREAKOUT_ROOMS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_BREAKOUT_ROOMS_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateBreakoutRooms');
  });

});
