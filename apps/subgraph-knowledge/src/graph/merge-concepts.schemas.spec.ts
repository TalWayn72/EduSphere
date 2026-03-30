import { describe, it, expect } from 'vitest';
import { MergeConceptsInputSchema } from './merge-concepts.schemas';

describe('MergeConceptsInputSchema', () => {
  it('accepts valid input', () => {
    const input = {
      sourceConceptId: 'concept-1',
      targetConceptId: 'concept-2',
      keepTarget: true,
    };
    const result = MergeConceptsInputSchema.parse(input);
    expect(result.sourceConceptId).toBe('concept-1');
    expect(result.targetConceptId).toBe('concept-2');
    expect(result.keepTarget).toBe(true);
  });

  it('rejects empty sourceConceptId', () => {
    const input = {
      sourceConceptId: '',
      targetConceptId: 'concept-2',
      keepTarget: true,
    };
    expect(() => MergeConceptsInputSchema.parse(input)).toThrow();
  });

  it('rejects empty targetConceptId', () => {
    const input = {
      sourceConceptId: 'concept-1',
      targetConceptId: '',
      keepTarget: true,
    };
    expect(() => MergeConceptsInputSchema.parse(input)).toThrow();
  });

  it('rejects missing keepTarget', () => {
    const input = {
      sourceConceptId: 'concept-1',
      targetConceptId: 'concept-2',
    };
    expect(() => MergeConceptsInputSchema.parse(input)).toThrow();
  });

  it('accepts keepTarget as false', () => {
    const input = {
      sourceConceptId: 'concept-1',
      targetConceptId: 'concept-2',
      keepTarget: false,
    };
    const result = MergeConceptsInputSchema.parse(input);
    expect(result.keepTarget).toBe(false);
  });
});
