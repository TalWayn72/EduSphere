import { describe, it, expect } from 'vitest';
import {
  ANNOTATIONS_QUERY,
  MY_ANNOTATIONS_QUERY,
  REPLY_TO_ANNOTATION_MUTATION,
  PROMOTE_ANNOTATION_MUTATION,
} from './annotation.queries';

describe('annotation.queries', () => {
  it('exports ANNOTATIONS_QUERY as a query DocumentNode', () => {
    expect(ANNOTATIONS_QUERY).toBeDefined();
    expect(ANNOTATIONS_QUERY.kind).toBe('Document');
    expect(ANNOTATIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ANNOTATIONS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Annotations');
  });

  it('exports MY_ANNOTATIONS_QUERY as a query DocumentNode', () => {
    expect(MY_ANNOTATIONS_QUERY).toBeDefined();
    expect(MY_ANNOTATIONS_QUERY.kind).toBe('Document');
    expect(MY_ANNOTATIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_ANNOTATIONS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyAnnotations');
  });

  it('exports REPLY_TO_ANNOTATION_MUTATION as a mutation DocumentNode', () => {
    expect(REPLY_TO_ANNOTATION_MUTATION).toBeDefined();
    expect(REPLY_TO_ANNOTATION_MUTATION.kind).toBe('Document');
    expect(
      REPLY_TO_ANNOTATION_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = REPLY_TO_ANNOTATION_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ReplyToAnnotation');
  });

  it('exports PROMOTE_ANNOTATION_MUTATION as a mutation DocumentNode', () => {
    expect(PROMOTE_ANNOTATION_MUTATION).toBeDefined();
    expect(PROMOTE_ANNOTATION_MUTATION.kind).toBe('Document');
    expect(
      PROMOTE_ANNOTATION_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = PROMOTE_ANNOTATION_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('PromoteAnnotation');
  });
});
