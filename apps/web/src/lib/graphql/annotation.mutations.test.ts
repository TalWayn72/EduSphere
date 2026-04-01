import { describe, it, expect } from 'vitest';
import {
  CREATE_ANNOTATION_MUTATION,
  UPDATE_ANNOTATION_MUTATION,
  DELETE_ANNOTATION_MUTATION,
  ANNOTATIONS_BY_ASSET_QUERY,
  ANNOTATION_ADDED_SUBSCRIPTION,
} from './annotation.mutations';

describe('annotation.mutations', () => {
  it('exports CREATE_ANNOTATION_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_ANNOTATION_MUTATION).toBeDefined();
    expect(CREATE_ANNOTATION_MUTATION.kind).toBe('Document');
    expect(
      CREATE_ANNOTATION_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CREATE_ANNOTATION_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateAnnotation');
  });

  it('exports UPDATE_ANNOTATION_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_ANNOTATION_MUTATION).toBeDefined();
    expect(UPDATE_ANNOTATION_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_ANNOTATION_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_ANNOTATION_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateAnnotation');
  });

  it('exports DELETE_ANNOTATION_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_ANNOTATION_MUTATION).toBeDefined();
    expect(DELETE_ANNOTATION_MUTATION.kind).toBe('Document');
    expect(
      DELETE_ANNOTATION_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = DELETE_ANNOTATION_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteAnnotation');
  });

  it('exports ANNOTATIONS_BY_ASSET_QUERY as a query DocumentNode', () => {
    expect(ANNOTATIONS_BY_ASSET_QUERY).toBeDefined();
    expect(ANNOTATIONS_BY_ASSET_QUERY.kind).toBe('Document');
    expect(
      ANNOTATIONS_BY_ASSET_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ANNOTATIONS_BY_ASSET_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AnnotationsByAsset');
  });

  it('exports ANNOTATION_ADDED_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(ANNOTATION_ADDED_SUBSCRIPTION).toBeDefined();
    expect(ANNOTATION_ADDED_SUBSCRIPTION.kind).toBe('Document');
    expect(
      ANNOTATION_ADDED_SUBSCRIPTION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ANNOTATION_ADDED_SUBSCRIPTION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('AnnotationAdded');
  });
});
