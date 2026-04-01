/**
 * error-messages utility tests
 *
 * Verifies:
 *  1. getUserFriendlyMessage maps network errors
 *  2. getUserFriendlyMessage maps auth errors (401, jwt expired)
 *  3. getUserFriendlyMessage maps forbidden errors (403)
 *  4. getUserFriendlyMessage maps not found errors (404)
 *  5. getUserFriendlyMessage maps timeout errors
 *  6. getUserFriendlyMessage maps rate limit errors (429)
 *  7. getUserFriendlyMessage maps server errors (500)
 *  8. getUserFriendlyMessage maps validation errors
 *  9. getUserFriendlyMessage maps CombinedError
 * 10. getUserFriendlyMessage maps GraphQL errors
 * 11. getUserFriendlyMessage returns fallback for unknown errors
 * 12. getUserFriendlyMessage accepts Error objects
 * 13. getUserFriendlyMessage accepts string errors
 * 14. getUserFriendlyMessage uses custom fallback
 * 15. getGraphQLErrorMessage uses first graphQL error if short
 * 16. getGraphQLErrorMessage falls back to getUserFriendlyMessage
 * 17. getGraphQLErrorMessage ignores stack-trace-like graphQL messages
 */
import { describe, it, expect } from 'vitest';
import {
  getUserFriendlyMessage,
  getGraphQLErrorMessage,
} from './error-messages';

describe('getUserFriendlyMessage', () => {
  it('maps network errors', () => {
    expect(getUserFriendlyMessage('Network error')).toBe(
      'Unable to reach the server. Please check your connection and try again.'
    );
    expect(getUserFriendlyMessage('ECONNREFUSED')).toBe(
      'Unable to reach the server. Please check your connection and try again.'
    );
    expect(getUserFriendlyMessage('fetch failed')).toBe(
      'Unable to reach the server. Please check your connection and try again.'
    );
  });

  it('maps auth errors', () => {
    expect(getUserFriendlyMessage('unauthorized')).toBe(
      'Your session has expired. Please sign in again.'
    );
    expect(getUserFriendlyMessage('Error 401')).toBe(
      'Your session has expired. Please sign in again.'
    );
    expect(getUserFriendlyMessage('jwt expired')).toBe(
      'Your session has expired. Please sign in again.'
    );
  });

  it('maps forbidden errors', () => {
    expect(getUserFriendlyMessage('forbidden')).toBe(
      'You do not have permission to perform this action.'
    );
    expect(getUserFriendlyMessage('403 Access denied')).toBe(
      'You do not have permission to perform this action.'
    );
  });

  it('maps not found errors', () => {
    expect(getUserFriendlyMessage('not found')).toBe(
      'The requested resource could not be found.'
    );
    expect(getUserFriendlyMessage('404')).toBe(
      'The requested resource could not be found.'
    );
  });

  it('maps timeout errors', () => {
    expect(getUserFriendlyMessage('timeout')).toBe(
      'The request timed out. Please try again.'
    );
    expect(getUserFriendlyMessage('ETIMEDOUT')).toBe(
      'The request timed out. Please try again.'
    );
    expect(getUserFriendlyMessage('504 Gateway Timeout')).toBe(
      'The request timed out. Please try again.'
    );
  });

  it('maps rate limit errors', () => {
    expect(getUserFriendlyMessage('rate limit exceeded')).toBe(
      'Too many requests. Please wait a moment and try again.'
    );
    expect(getUserFriendlyMessage('429 Too Many Requests')).toBe(
      'Too many requests. Please wait a moment and try again.'
    );
  });

  it('maps server errors', () => {
    expect(getUserFriendlyMessage('internal server error')).toBe(
      'A server error occurred. Please try again later.'
    );
    expect(getUserFriendlyMessage('500')).toBe(
      'A server error occurred. Please try again later.'
    );
  });

  it('maps validation errors', () => {
    expect(getUserFriendlyMessage('validation failed')).toBe(
      'Please check your input and try again.'
    );
    expect(getUserFriendlyMessage('invalid input')).toBe(
      'Please check your input and try again.'
    );
  });

  it('maps CombinedError', () => {
    expect(getUserFriendlyMessage('CombinedError: something')).toBe(
      'A data loading error occurred. Please refresh the page.'
    );
  });

  it('maps GraphQL errors', () => {
    expect(getUserFriendlyMessage('GraphQL error occurred')).toBe(
      'A data loading error occurred. Please try again.'
    );
  });

  it('returns fallback for unknown errors', () => {
    expect(getUserFriendlyMessage('something totally unknown')).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('accepts Error objects', () => {
    expect(getUserFriendlyMessage(new Error('network error'))).toBe(
      'Unable to reach the server. Please check your connection and try again.'
    );
  });

  it('accepts string errors', () => {
    expect(getUserFriendlyMessage('forbidden')).toBe(
      'You do not have permission to perform this action.'
    );
  });

  it('uses custom fallback', () => {
    expect(getUserFriendlyMessage('xyz', 'Custom fallback')).toBe(
      'Custom fallback'
    );
  });

  it('handles non-string, non-Error values', () => {
    expect(getUserFriendlyMessage(42)).toBe(
      'Something went wrong. Please try again.'
    );
    expect(getUserFriendlyMessage(null)).toBe(
      'Something went wrong. Please try again.'
    );
  });
});

describe('getGraphQLErrorMessage', () => {
  it('uses first graphQL error message when short and user-friendly', () => {
    const error = {
      message: 'CombinedError',
      graphQLErrors: [{ message: 'Course not found' }],
    };
    expect(getGraphQLErrorMessage(error)).toBe('Course not found');
  });

  it('falls back to generic mapping when no graphQL errors', () => {
    const error = { message: 'network error' };
    expect(getGraphQLErrorMessage(error)).toBe(
      'Unable to reach the server. Please check your connection and try again.'
    );
  });

  it('ignores graphQL error that looks like a stack trace', () => {
    const error = {
      message: 'CombinedError',
      graphQLErrors: [{ message: 'at resolveField (internal/graphql.js:123)' }],
    };
    expect(getGraphQLErrorMessage(error)).toBe(
      'A data loading error occurred. Please refresh the page.'
    );
  });

  it('ignores graphQL error longer than 120 chars', () => {
    const error = {
      message: 'CombinedError',
      graphQLErrors: [{ message: 'A'.repeat(121) }],
    };
    expect(getGraphQLErrorMessage(error)).toBe(
      'A data loading error occurred. Please refresh the page.'
    );
  });

  it('uses custom fallback', () => {
    const error = { message: 'xyz' };
    expect(getGraphQLErrorMessage(error, 'Custom')).toBe('Custom');
  });
});
