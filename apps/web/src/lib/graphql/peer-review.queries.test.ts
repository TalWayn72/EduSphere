import { describe, it, expect } from 'vitest';
import { MY_REVIEW_ASSIGNMENTS_QUERY, MY_SUBMISSIONS_QUERY, PEER_REVIEW_RUBRIC_QUERY, SUBMIT_PEER_REVIEW_MUTATION } from './peer-review.queries';

describe('peer-review.queries', () => {
  it('exports MY_REVIEW_ASSIGNMENTS_QUERY as a query DocumentNode', () => {
    expect(MY_REVIEW_ASSIGNMENTS_QUERY).toBeDefined();
    expect(MY_REVIEW_ASSIGNMENTS_QUERY.kind).toBe('Document');
    expect(MY_REVIEW_ASSIGNMENTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_REVIEW_ASSIGNMENTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyReviewAssignments');
  });

  it('exports MY_SUBMISSIONS_QUERY as a query DocumentNode', () => {
    expect(MY_SUBMISSIONS_QUERY).toBeDefined();
    expect(MY_SUBMISSIONS_QUERY.kind).toBe('Document');
    expect(MY_SUBMISSIONS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_SUBMISSIONS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MySubmissions');
  });

  it('exports PEER_REVIEW_RUBRIC_QUERY as a query DocumentNode', () => {
    expect(PEER_REVIEW_RUBRIC_QUERY).toBeDefined();
    expect(PEER_REVIEW_RUBRIC_QUERY.kind).toBe('Document');
    expect(PEER_REVIEW_RUBRIC_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PEER_REVIEW_RUBRIC_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PeerReviewRubric');
  });

  it('exports SUBMIT_PEER_REVIEW_MUTATION as a mutation DocumentNode', () => {
    expect(SUBMIT_PEER_REVIEW_MUTATION).toBeDefined();
    expect(SUBMIT_PEER_REVIEW_MUTATION.kind).toBe('Document');
    expect(SUBMIT_PEER_REVIEW_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SUBMIT_PEER_REVIEW_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SubmitPeerReview');
  });

});
