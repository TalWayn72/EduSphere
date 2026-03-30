import { describe, it, expect } from 'vitest';
import {
  isKnowledgeConceptEvent,
  isKnowledgeConceptDeletedEvent,
} from './knowledge-events.js';

describe('knowledge-events type guards', () => {
  describe('isKnowledgeConceptEvent', () => {
    const valid = {
      type: 'knowledge.concepts.extracted' as const,
      assetId: 'asset-001',
      concepts: [
        { name: 'Graph Theory', description: 'Study of graphs' },
        { name: 'Euler Path', relationships: ['Graph Theory'] },
      ],
    };

    it('returns true for knowledge.concepts.extracted', () => {
      expect(isKnowledgeConceptEvent(valid)).toBe(true);
    });

    it('returns true for knowledge.concepts.persisted', () => {
      expect(
        isKnowledgeConceptEvent({ ...valid, type: 'knowledge.concepts.persisted' })
      ).toBe(true);
    });

    it('returns true with empty concepts array', () => {
      expect(
        isKnowledgeConceptEvent({ ...valid, concepts: [] })
      ).toBe(true);
    });

    it('returns false for knowledge.concept.deleted type', () => {
      expect(
        isKnowledgeConceptEvent({ ...valid, type: 'knowledge.concept.deleted' })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isKnowledgeConceptEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isKnowledgeConceptEvent(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isKnowledgeConceptEvent('string')).toBe(false);
    });

    it('returns false when assetId missing', () => {
      const { assetId: _, ...rest } = valid;
      expect(isKnowledgeConceptEvent(rest)).toBe(false);
    });

    it('returns false when concepts is not an array', () => {
      expect(
        isKnowledgeConceptEvent({ ...valid, concepts: 'not-array' })
      ).toBe(false);
    });

    it('returns false when assetId is not a string', () => {
      expect(
        isKnowledgeConceptEvent({ ...valid, assetId: 42 })
      ).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isKnowledgeConceptEvent({})).toBe(false);
    });
  });

  describe('isKnowledgeConceptDeletedEvent', () => {
    const valid = {
      type: 'knowledge.concept.deleted' as const,
      conceptId: 'concept-001',
      tenantId: 'tenant-001',
      embeddingsDeleted: 5,
    };

    it('returns true for valid deleted event', () => {
      expect(isKnowledgeConceptDeletedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isKnowledgeConceptDeletedEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isKnowledgeConceptDeletedEvent(undefined)).toBe(false);
    });

    it('returns false when type is wrong', () => {
      expect(
        isKnowledgeConceptDeletedEvent({
          ...valid,
          type: 'knowledge.concepts.extracted',
        })
      ).toBe(false);
    });

    it('returns false when conceptId missing', () => {
      const { conceptId: _, ...rest } = valid;
      expect(isKnowledgeConceptDeletedEvent(rest)).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isKnowledgeConceptDeletedEvent(rest)).toBe(false);
    });

    it('returns false when conceptId is not a string', () => {
      expect(
        isKnowledgeConceptDeletedEvent({ ...valid, conceptId: 42 })
      ).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isKnowledgeConceptDeletedEvent({})).toBe(false);
    });
  });
});
