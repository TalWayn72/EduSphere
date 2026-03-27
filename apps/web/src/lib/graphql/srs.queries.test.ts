import { describe, it, expect } from 'vitest';
import { DUE_REVIEWS_QUERY, SRS_QUEUE_COUNT_QUERY, SUBMIT_REVIEW_MUTATION, CREATE_REVIEW_CARD_MUTATION } from './srs.queries';

describe('srs.queries', () => {
  it('exports DUE_REVIEWS_QUERY as a query DocumentNode', () => {
    expect(DUE_REVIEWS_QUERY).toBeDefined();
    expect(DUE_REVIEWS_QUERY.kind).toBe('Document');
    expect(DUE_REVIEWS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DUE_REVIEWS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('DueReviews');
  });

  it('exports SRS_QUEUE_COUNT_QUERY as a query DocumentNode', () => {
    expect(SRS_QUEUE_COUNT_QUERY).toBeDefined();
    expect(SRS_QUEUE_COUNT_QUERY.kind).toBe('Document');
    expect(SRS_QUEUE_COUNT_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SRS_QUEUE_COUNT_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SrsQueueCount');
  });

  it('exports SUBMIT_REVIEW_MUTATION as a mutation DocumentNode', () => {
    expect(SUBMIT_REVIEW_MUTATION).toBeDefined();
    expect(SUBMIT_REVIEW_MUTATION.kind).toBe('Document');
    expect(SUBMIT_REVIEW_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SUBMIT_REVIEW_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SubmitReview');
  });

  it('exports CREATE_REVIEW_CARD_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_REVIEW_CARD_MUTATION).toBeDefined();
    expect(CREATE_REVIEW_CARD_MUTATION.kind).toBe('Document');
    expect(CREATE_REVIEW_CARD_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_REVIEW_CARD_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateReviewCard');
  });

});
