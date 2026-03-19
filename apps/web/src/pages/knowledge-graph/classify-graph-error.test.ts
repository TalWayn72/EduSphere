import { describe, it, expect } from 'vitest';
import type { CombinedError } from 'urql';
import { classifyGraphError, type GraphErrorKind } from './use-graph-data';

// Helper: build a minimal CombinedError-like object for testing.
function fakeError(
  overrides: Partial<CombinedError> & { message?: string }
): CombinedError {
  return {
    name: 'CombinedError',
    message: overrides.message ?? '',
    graphQLErrors: overrides.graphQLErrors ?? [],
    networkError: overrides.networkError,
    response: overrides.response,
  } as CombinedError;
}

describe('classifyGraphError — BUG-096', () => {
  it('returns null for undefined error', () => {
    expect(classifyGraphError(undefined)).toBe(null);
  });

  it('returns "network" when networkError is present', () => {
    const err = fakeError({
      message: '[Network] Failed to fetch',
      networkError: new Error('Failed to fetch'),
    });
    expect(classifyGraphError(err)).toBe('network');
  });

  it('returns "auth" when message contains "unauthorized"', () => {
    const err = fakeError({ message: 'Unauthorized' });
    expect(classifyGraphError(err)).toBe('auth');
  });

  it('returns "auth" when message contains "authentication required"', () => {
    const err = fakeError({ message: 'Authentication required' });
    expect(classifyGraphError(err)).toBe('auth');
  });

  it('returns "auth" when message contains "unauthenticated"', () => {
    const err = fakeError({ message: 'Request is unauthenticated' });
    expect(classifyGraphError(err)).toBe('auth');
  });

  it('returns "auth" when message contains "forbidden"', () => {
    const err = fakeError({ message: 'Forbidden' });
    expect(classifyGraphError(err)).toBe('auth');
  });

  it('returns "auth" when graphQLErrors has UNAUTHENTICATED code', () => {
    const err = fakeError({
      message: 'Some error',
      graphQLErrors: [
        { message: 'Not allowed', extensions: { code: 'UNAUTHENTICATED' } },
      ] as CombinedError['graphQLErrors'],
    });
    expect(classifyGraphError(err)).toBe('auth');
  });

  it('returns "auth" when graphQLErrors has FORBIDDEN code', () => {
    const err = fakeError({
      message: 'Some error',
      graphQLErrors: [
        { message: 'Access denied', extensions: { code: 'FORBIDDEN' } },
      ] as CombinedError['graphQLErrors'],
    });
    expect(classifyGraphError(err)).toBe('auth');
  });

  it('returns "graphql" for generic GraphQL errors', () => {
    const err = fakeError({
      message: 'Some error',
      graphQLErrors: [
        { message: 'Invalid time value', extensions: {} },
      ] as CombinedError['graphQLErrors'],
    });
    expect(classifyGraphError(err)).toBe('graphql');
  });

  it('returns "network" as fallback for unknown errors', () => {
    const err = fakeError({ message: 'Something went wrong' });
    expect(classifyGraphError(err)).toBe('network');
  });

  // BUG-096: networkError takes priority over auth message
  it('returns "network" when both networkError and auth message are present', () => {
    const err = fakeError({
      message: 'Unauthorized',
      networkError: new Error('CORS error'),
    });
    expect(classifyGraphError(err)).toBe('network');
  });
});
