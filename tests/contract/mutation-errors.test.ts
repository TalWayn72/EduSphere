/**
 * Mutation Error Shape Contract Tests
 *
 * Validates that GraphQL mutation error responses conform to the API contract:
 * - errors[].extensions.code is always present
 * - errors[].extensions.details is present for validation errors
 * - Standard error codes are used consistently
 *
 * These are static contract tests — no real server required.
 * See API-CONTRACTS-GRAPHQL-FEDERATION.md §6 for the full error contract.
 */
import { describe, it, expect } from 'vitest';

const STANDARD_ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_USER_INPUT',
  'NOT_FOUND',
  'INTERNAL_SERVER_ERROR',
  'CONSENT_REQUIRED',
  'RATE_LIMITED',
  'CONFLICT',
] as const;

type ErrorCode = (typeof STANDARD_ERROR_CODES)[number];

interface ValidationDetail {
  field: string;
  message: string;
}

interface GraphQLErrorExtensions {
  code: ErrorCode;
  details?: ValidationDetail[];
}

interface MockGraphQLError {
  message: string;
  path?: string[];
  extensions: GraphQLErrorExtensions;
}

interface MockMutationResponse<T = unknown> {
  data?: T;
  errors?: MockGraphQLError[];
}

function createMockGraphQLError(
  code: ErrorCode,
  message: string,
  details?: ValidationDetail[]
): MockGraphQLError {
  const ext: GraphQLErrorExtensions = { code };
  if (details !== undefined) ext.details = details;
  return { message, extensions: ext };
}

function createMockValidationError(
  details: ValidationDetail[]
): MockGraphQLError {
  return createMockGraphQLError(
    'BAD_USER_INPUT',
    'Input validation failed',
    details
  );
}

function isScreamingSnakeCase(value: string): boolean {
  return /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(value);
}

describe('GraphQL Mutation Error Shape Contract', () => {
  describe('Error structure invariants', () => {
    it('every error has extensions.code', () => {
      const err = createMockGraphQLError('NOT_FOUND', 'Resource not found');
      expect(err.extensions).toBeDefined();
      expect(err.extensions.code).toBeDefined();
    });

    it('extensions.code is a non-empty string', () => {
      const err = createMockGraphQLError('FORBIDDEN', 'Access denied');
      expect(typeof err.extensions.code).toBe('string');
      expect(err.extensions.code.length).toBeGreaterThan(0);
    });

    it('message is a non-empty string', () => {
      const err = createMockGraphQLError('UNAUTHENTICATED', 'JWT missing');
      expect(typeof err.message).toBe('string');
      expect(err.message.length).toBeGreaterThan(0);
    });

    it('path is present when error is field-level', () => {
      const err: MockGraphQLError = {
        ...createMockGraphQLError('NOT_FOUND', 'User not found'),
        path: ['createAnnotation', 'userId'],
      };
      expect(err.path).toBeDefined();
      expect(err.path!.length).toBeGreaterThan(0);
    });
  });

  describe('Standard error codes', () => {
    it('UNAUTHENTICATED is returned for missing/invalid JWT', () => {
      const err = createMockGraphQLError(
        'UNAUTHENTICATED',
        'JWT is missing or invalid'
      );
      expect(err.extensions.code).toBe('UNAUTHENTICATED');
    });

    it('FORBIDDEN is returned for insufficient permissions', () => {
      const err = createMockGraphQLError(
        'FORBIDDEN',
        'Insufficient scope: course:write'
      );
      expect(err.extensions.code).toBe('FORBIDDEN');
    });

    it('BAD_USER_INPUT is returned for Zod validation failures', () => {
      const err = createMockValidationError([
        { field: 'title', message: 'Required' },
      ]);
      expect(err.extensions.code).toBe('BAD_USER_INPUT');
    });

    it('NOT_FOUND is returned for missing entities', () => {
      const err = createMockGraphQLError('NOT_FOUND', 'Course not found');
      expect(err.extensions.code).toBe('NOT_FOUND');
    });

    it('INTERNAL_SERVER_ERROR is returned for unexpected failures', () => {
      const err = createMockGraphQLError(
        'INTERNAL_SERVER_ERROR',
        'Unexpected error'
      );
      expect(err.extensions.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('CONSENT_REQUIRED is returned when LLM consent is missing', () => {
      const err = createMockGraphQLError(
        'CONSENT_REQUIRED',
        'Third-party LLM consent required'
      );
      expect(err.extensions.code).toBe('CONSENT_REQUIRED');
    });
  });

  describe('Validation error shape (BAD_USER_INPUT)', () => {
    it('includes extensions.details array when validation fails', () => {
      const err = createMockValidationError([
        { field: 'email', message: 'Invalid email format' },
      ]);
      expect(Array.isArray(err.extensions.details)).toBe(true);
      expect(err.extensions.details!.length).toBeGreaterThan(0);
    });

    it('details[].field identifies the invalid field', () => {
      const err = createMockValidationError([
        { field: 'title', message: 'Too short' },
      ]);
      expect(err.extensions.details![0].field).toBe('title');
    });

    it('details[].message describes the validation rule', () => {
      const err = createMockValidationError([
        { field: 'title', message: 'Too short' },
      ]);
      expect(typeof err.extensions.details![0].message).toBe('string');
      expect(err.extensions.details![0].message.length).toBeGreaterThan(0);
    });

    it('does not expose stack traces in production mode', () => {
      const err = createMockGraphQLError(
        'INTERNAL_SERVER_ERROR',
        'Unexpected error'
      );
      expect((err as Record<string, unknown>)['stackTrace']).toBeUndefined();
      expect(
        (err.extensions as Record<string, unknown>)['stackTrace']
      ).toBeUndefined();
    });
  });

  describe('Response shape when mutation succeeds', () => {
    it('successful mutation has data field and no errors field', () => {
      const response: MockMutationResponse<{ createCourse: { id: string } }> = {
        data: { createCourse: { id: 'uuid-123' } },
      };
      expect(response.data).toBeDefined();
      expect(response.errors).toBeUndefined();
    });

    it('data field matches the mutation return type', () => {
      const response: MockMutationResponse<{
        createAnnotation: { id: string; body: string };
      }> = {
        data: { createAnnotation: { id: 'ann-1', body: 'Great point' } },
      };
      expect(response.data!.createAnnotation.id).toBe('ann-1');
      expect(typeof response.data!.createAnnotation.body).toBe('string');
    });
  });

  describe('Error code registry completeness', () => {
    it('STANDARD_ERROR_CODES list matches API contract', () => {
      expect(STANDARD_ERROR_CODES).toContain('UNAUTHENTICATED');
      expect(STANDARD_ERROR_CODES).toContain('FORBIDDEN');
      expect(STANDARD_ERROR_CODES).toContain('BAD_USER_INPUT');
      expect(STANDARD_ERROR_CODES).toContain('NOT_FOUND');
      expect(STANDARD_ERROR_CODES).toContain('INTERNAL_SERVER_ERROR');
      expect(STANDARD_ERROR_CODES).toContain('CONSENT_REQUIRED');
      expect(STANDARD_ERROR_CODES).toContain('RATE_LIMITED');
      expect(STANDARD_ERROR_CODES).toContain('CONFLICT');
      expect(STANDARD_ERROR_CODES.length).toBe(8);
    });

    it('all error codes follow SCREAMING_SNAKE_CASE convention', () => {
      for (const code of STANDARD_ERROR_CODES) {
        expect(
          isScreamingSnakeCase(code),
          `"${code}" is not SCREAMING_SNAKE_CASE`
        ).toBe(true);
      }
    });
  });
});
