import { describe, it, expect } from 'vitest';
import {
  scenarioChoiceItemSchema,
  scenarioContentSchema,
  recordScenarioChoiceInputSchema,
} from './scenario.schemas.js';

// ── scenarioChoiceItemSchema ──────────────────────────────────────────────────

describe('scenarioChoiceItemSchema', () => {
  const valid = {
    id: 'choice-1',
    text: 'Go left',
    nextContentItemId: null,
  };

  it('parses a valid choice item with null nextContentItemId', () => {
    const result = scenarioChoiceItemSchema.parse(valid);
    expect(result.id).toBe('choice-1');
    expect(result.text).toBe('Go left');
    expect(result.nextContentItemId).toBeNull();
  });

  it('parses a valid choice item with a UUID nextContentItemId', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const result = scenarioChoiceItemSchema.parse({
      ...valid,
      nextContentItemId: uuid,
    });
    expect(result.nextContentItemId).toBe(uuid);
  });

  it('rejects empty id', () => {
    expect(() =>
      scenarioChoiceItemSchema.parse({ ...valid, id: '' })
    ).toThrow();
  });

  it('rejects id longer than 100 characters', () => {
    expect(() =>
      scenarioChoiceItemSchema.parse({ ...valid, id: 'x'.repeat(101) })
    ).toThrow();
  });

  it('rejects empty text', () => {
    expect(() =>
      scenarioChoiceItemSchema.parse({ ...valid, text: '' })
    ).toThrow();
  });

  it('rejects text longer than 500 characters', () => {
    expect(() =>
      scenarioChoiceItemSchema.parse({ ...valid, text: 'a'.repeat(501) })
    ).toThrow();
  });

  it('rejects non-UUID nextContentItemId', () => {
    expect(() =>
      scenarioChoiceItemSchema.parse({
        ...valid,
        nextContentItemId: 'not-a-uuid',
      })
    ).toThrow();
  });
});

// ── scenarioContentSchema ─────────────────────────────────────────────────────

describe('scenarioContentSchema', () => {
  const choice = {
    id: 'c1',
    text: 'Option A',
    nextContentItemId: null,
  };

  const valid = {
    title: 'The Crossroads',
    description: 'You stand at a crossroads. What do you do?',
    choices: [choice],
    isEndNode: false,
  };

  it('parses a valid scenario content', () => {
    const result = scenarioContentSchema.parse(valid);
    expect(result.title).toBe('The Crossroads');
    expect(result.isEndNode).toBe(false);
    expect(result.choices).toHaveLength(1);
    expect(result.endingType).toBeUndefined();
  });

  it('accepts endingType as optional enum', () => {
    const result = scenarioContentSchema.parse({
      ...valid,
      endingType: 'SUCCESS',
    });
    expect(result.endingType).toBe('SUCCESS');
  });

  it('accepts all valid endingType values', () => {
    for (const ending of ['SUCCESS', 'FAILURE', 'NEUTRAL'] as const) {
      expect(
        scenarioContentSchema.parse({ ...valid, endingType: ending }).endingType
      ).toBe(ending);
    }
  });

  it('rejects more than 8 choices', () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => ({
      id: `c${i}`,
      text: `Choice ${i}`,
      nextContentItemId: null,
    }));
    expect(() =>
      scenarioContentSchema.parse({ ...valid, choices: tooMany })
    ).toThrow();
  });

  it('rejects empty title', () => {
    expect(() =>
      scenarioContentSchema.parse({ ...valid, title: '' })
    ).toThrow();
  });

  it('rejects title longer than 255 characters', () => {
    expect(() =>
      scenarioContentSchema.parse({ ...valid, title: 'x'.repeat(256) })
    ).toThrow();
  });

  it('rejects empty description', () => {
    expect(() =>
      scenarioContentSchema.parse({ ...valid, description: '' })
    ).toThrow();
  });

  it('rejects description longer than 5000 characters', () => {
    expect(() =>
      scenarioContentSchema.parse({ ...valid, description: 'd'.repeat(5001) })
    ).toThrow();
  });

  it('rejects invalid endingType', () => {
    expect(() =>
      scenarioContentSchema.parse({ ...valid, endingType: 'DRAW' })
    ).toThrow();
  });
});

// ── recordScenarioChoiceInputSchema ──────────────────────────────────────────

describe('recordScenarioChoiceInputSchema', () => {
  const uuid1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const uuid2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

  const valid = {
    fromContentItemId: uuid1,
    choiceId: 'choice-abc',
    scenarioRootId: uuid2,
  };

  it('parses a valid record scenario choice input', () => {
    const result = recordScenarioChoiceInputSchema.parse(valid);
    expect(result.fromContentItemId).toBe(uuid1);
    expect(result.choiceId).toBe('choice-abc');
    expect(result.scenarioRootId).toBe(uuid2);
  });

  it('rejects invalid fromContentItemId (non-UUID)', () => {
    expect(() =>
      recordScenarioChoiceInputSchema.parse({
        ...valid,
        fromContentItemId: 'not-a-uuid',
      })
    ).toThrow();
  });

  it('rejects empty choiceId', () => {
    expect(() =>
      recordScenarioChoiceInputSchema.parse({ ...valid, choiceId: '' })
    ).toThrow();
  });

  it('rejects invalid scenarioRootId (non-UUID)', () => {
    expect(() =>
      recordScenarioChoiceInputSchema.parse({
        ...valid,
        scenarioRootId: 'bad-id',
      })
    ).toThrow();
  });
});
