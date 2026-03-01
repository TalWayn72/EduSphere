import { describe, it, expect } from 'vitest';
import {
  QuizItemTypeSchema,
  MultipleChoiceSchema,
  DragOrderSchema,
  HotspotSchema,
  MatchingSchema,
  LikertSchema,
  FillBlankSchema,
  QuizItemSchema,
  QuizContentSchema,
} from './quiz-schemas.js';

// ── QuizItemTypeSchema ────────────────────────────────────────────────────────

describe('QuizItemTypeSchema', () => {
  it('accepts all 6 valid enum values', () => {
    const types = ['MULTIPLE_CHOICE', 'DRAG_ORDER', 'HOTSPOT', 'MATCHING', 'LIKERT', 'FILL_BLANK'];
    for (const t of types) {
      expect(QuizItemTypeSchema.parse(t)).toBe(t);
    }
  });

  it('rejects an unknown type', () => {
    expect(() => QuizItemTypeSchema.parse('ESSAY')).toThrow();
  });
});

// ── MultipleChoiceSchema ──────────────────────────────────────────────────────

describe('MultipleChoiceSchema', () => {
  const valid = {
    type: 'MULTIPLE_CHOICE' as const,
    question: 'What is 2 + 2?',
    options: [
      { id: 'a', text: 'Three' },
      { id: 'b', text: 'Four' },
    ],
    correctOptionIds: ['b'],
  };

  it('parses a valid multiple-choice item', () => {
    const result = MultipleChoiceSchema.parse(valid);
    expect(result.type).toBe('MULTIPLE_CHOICE');
    expect(result.question).toBe('What is 2 + 2?');
    expect(result.options).toHaveLength(2);
    expect(result.correctOptionIds).toEqual(['b']);
  });

  it('accepts optional explanation', () => {
    const result = MultipleChoiceSchema.parse({ ...valid, explanation: 'Because math.' });
    expect(result.explanation).toBe('Because math.');
  });

  it('rejects fewer than 2 options', () => {
    expect(() =>
      MultipleChoiceSchema.parse({ ...valid, options: [{ id: 'a', text: 'Only one' }] })
    ).toThrow();
  });

  it('rejects more than 8 options', () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => ({ id: String(i), text: `Opt ${i}` }));
    expect(() => MultipleChoiceSchema.parse({ ...valid, options: tooMany })).toThrow();
  });

  it('rejects empty correctOptionIds', () => {
    expect(() => MultipleChoiceSchema.parse({ ...valid, correctOptionIds: [] })).toThrow();
  });

  it('rejects empty question', () => {
    expect(() => MultipleChoiceSchema.parse({ ...valid, question: '' })).toThrow();
  });
});

// ── DragOrderSchema ───────────────────────────────────────────────────────────

describe('DragOrderSchema', () => {
  const valid = {
    type: 'DRAG_ORDER' as const,
    question: 'Order these steps',
    items: [
      { id: 'a', text: 'Step 1' },
      { id: 'b', text: 'Step 2' },
    ],
    correctOrder: ['a', 'b'],
  };

  it('parses a valid drag-order item', () => {
    const result = DragOrderSchema.parse(valid);
    expect(result.type).toBe('DRAG_ORDER');
    expect(result.items).toHaveLength(2);
    expect(result.correctOrder).toEqual(['a', 'b']);
  });

  it('rejects fewer than 2 items', () => {
    expect(() =>
      DragOrderSchema.parse({ ...valid, items: [{ id: 'a', text: 'Solo' }] })
    ).toThrow();
  });

  it('rejects correctOrder with fewer than 2 entries', () => {
    expect(() => DragOrderSchema.parse({ ...valid, correctOrder: ['a'] })).toThrow();
  });
});

// ── HotspotSchema ─────────────────────────────────────────────────────────────

describe('HotspotSchema', () => {
  const valid = {
    type: 'HOTSPOT' as const,
    question: 'Click the heart',
    imageUrl: 'https://example.com/diagram.png',
    hotspots: [{ id: 'h1', x: 50, y: 60, label: 'Heart' }],
    correctHotspotIds: ['h1'],
  };

  it('parses a valid hotspot item', () => {
    const result = HotspotSchema.parse(valid);
    expect(result.type).toBe('HOTSPOT');
    expect(result.imageUrl).toBe('https://example.com/diagram.png');
    expect(result.hotspots[0]?.radius).toBe(5); // default
  });

  it('rejects invalid imageUrl', () => {
    expect(() => HotspotSchema.parse({ ...valid, imageUrl: 'not-a-url' })).toThrow();
  });

  it('rejects empty correctHotspotIds', () => {
    expect(() => HotspotSchema.parse({ ...valid, correctHotspotIds: [] })).toThrow();
  });

  it('rejects x/y out of 0-100 range', () => {
    const badHotspot = [{ id: 'h1', x: 150, y: 60, label: 'Out' }];
    expect(() => HotspotSchema.parse({ ...valid, hotspots: badHotspot })).toThrow();
  });
});

// ── MatchingSchema ────────────────────────────────────────────────────────────

describe('MatchingSchema', () => {
  const valid = {
    type: 'MATCHING' as const,
    question: 'Match terms to definitions',
    leftItems: [
      { id: 'l1', text: 'Cat' },
      { id: 'l2', text: 'Dog' },
    ],
    rightItems: [
      { id: 'r1', text: 'Feline' },
      { id: 'r2', text: 'Canine' },
    ],
    correctPairs: [
      { leftId: 'l1', rightId: 'r1' },
      { leftId: 'l2', rightId: 'r2' },
    ],
  };

  it('parses a valid matching item', () => {
    const result = MatchingSchema.parse(valid);
    expect(result.type).toBe('MATCHING');
    expect(result.leftItems).toHaveLength(2);
    expect(result.rightItems).toHaveLength(2);
  });

  it('rejects fewer than 2 leftItems', () => {
    expect(() =>
      MatchingSchema.parse({ ...valid, leftItems: [{ id: 'l1', text: 'Solo' }] })
    ).toThrow();
  });

  it('rejects fewer than 2 rightItems', () => {
    expect(() =>
      MatchingSchema.parse({ ...valid, rightItems: [{ id: 'r1', text: 'Solo' }] })
    ).toThrow();
  });
});

// ── LikertSchema ──────────────────────────────────────────────────────────────

describe('LikertSchema', () => {
  const valid = {
    type: 'LIKERT' as const,
    question: 'How satisfied are you?',
  };

  it('parses a valid likert item with default scale of 5', () => {
    const result = LikertSchema.parse(valid);
    expect(result.type).toBe('LIKERT');
    expect(result.scale).toBe(5);
  });

  it('accepts scale between 3 and 7', () => {
    expect(LikertSchema.parse({ ...valid, scale: 3 }).scale).toBe(3);
    expect(LikertSchema.parse({ ...valid, scale: 7 }).scale).toBe(7);
  });

  it('rejects scale below 3', () => {
    expect(() => LikertSchema.parse({ ...valid, scale: 2 })).toThrow();
  });

  it('rejects scale above 7', () => {
    expect(() => LikertSchema.parse({ ...valid, scale: 8 })).toThrow();
  });

  it('accepts optional labels object', () => {
    const result = LikertSchema.parse({ ...valid, labels: { min: 'Disagree', max: 'Agree' } });
    expect(result.labels?.min).toBe('Disagree');
  });
});

// ── FillBlankSchema ───────────────────────────────────────────────────────────

describe('FillBlankSchema', () => {
  const valid = {
    type: 'FILL_BLANK' as const,
    question: 'The capital of France is ___.',
    correctAnswer: 'Paris',
  };

  it('parses a valid fill-blank item with defaults', () => {
    const result = FillBlankSchema.parse(valid);
    expect(result.type).toBe('FILL_BLANK');
    expect(result.useSemanticMatching).toBe(false);
    expect(result.similarityThreshold).toBe(0.85);
  });

  it('accepts explicit useSemanticMatching=true', () => {
    const result = FillBlankSchema.parse({ ...valid, useSemanticMatching: true });
    expect(result.useSemanticMatching).toBe(true);
  });

  it('accepts similarityThreshold within 0-1', () => {
    expect(FillBlankSchema.parse({ ...valid, similarityThreshold: 0 }).similarityThreshold).toBe(0);
    expect(FillBlankSchema.parse({ ...valid, similarityThreshold: 1 }).similarityThreshold).toBe(1);
  });

  it('rejects similarityThreshold above 1', () => {
    expect(() => FillBlankSchema.parse({ ...valid, similarityThreshold: 1.1 })).toThrow();
  });

  it('rejects empty correctAnswer', () => {
    expect(() => FillBlankSchema.parse({ ...valid, correctAnswer: '' })).toThrow();
  });
});

// ── QuizItemSchema (discriminated union) ──────────────────────────────────────

describe('QuizItemSchema', () => {
  it('discriminates MULTIPLE_CHOICE by type', () => {
    const item = QuizItemSchema.parse({
      type: 'MULTIPLE_CHOICE',
      question: 'Q?',
      options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
      correctOptionIds: ['a'],
    });
    expect(item.type).toBe('MULTIPLE_CHOICE');
  });

  it('discriminates LIKERT by type', () => {
    const item = QuizItemSchema.parse({ type: 'LIKERT', question: 'How?' });
    expect(item.type).toBe('LIKERT');
  });

  it('discriminates FILL_BLANK by type', () => {
    const item = QuizItemSchema.parse({
      type: 'FILL_BLANK',
      question: 'Fill ___',
      correctAnswer: 'it',
    });
    expect(item.type).toBe('FILL_BLANK');
  });

  it('rejects an unknown discriminant', () => {
    expect(() => QuizItemSchema.parse({ type: 'ESSAY', question: 'Why?' })).toThrow();
  });
});

// ── QuizContentSchema ─────────────────────────────────────────────────────────

describe('QuizContentSchema', () => {
  const mcItem = {
    type: 'MULTIPLE_CHOICE' as const,
    question: 'Q?',
    options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    correctOptionIds: ['a'],
  };
  const likertItem = { type: 'LIKERT' as const, question: 'Rate this' };

  it('parses a minimal quiz with defaults', () => {
    const result = QuizContentSchema.parse({ items: [mcItem] });
    expect(result.randomizeOrder).toBe(false);
    expect(result.showExplanations).toBe(true);
    expect(result.passingScore).toBe(70);
  });

  it('accepts a mixed array of item types', () => {
    const result = QuizContentSchema.parse({ items: [mcItem, likertItem] });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.type).toBe('MULTIPLE_CHOICE');
    expect(result.items[1]?.type).toBe('LIKERT');
  });

  it('rejects empty items array', () => {
    expect(() => QuizContentSchema.parse({ items: [] })).toThrow();
  });

  it('rejects more than 50 items', () => {
    const tooMany = Array.from({ length: 51 }, () => likertItem);
    expect(() => QuizContentSchema.parse({ items: tooMany })).toThrow();
  });

  it('rejects passingScore above 100', () => {
    expect(() =>
      QuizContentSchema.parse({ items: [mcItem], passingScore: 101 })
    ).toThrow();
  });

  it('rejects passingScore below 0', () => {
    expect(() =>
      QuizContentSchema.parse({ items: [mcItem], passingScore: -1 })
    ).toThrow();
  });

  it('applies explicit passingScore override', () => {
    const result = QuizContentSchema.parse({ items: [mcItem], passingScore: 80 });
    expect(result.passingScore).toBe(80);
  });
});
