import { describe, it, expect, beforeEach } from 'vitest';
import { QuizGraderService } from './quiz-grader.service';
import type { QuizContent } from './quiz-schemas';

describe('QuizGraderService', () => {
  let grader: QuizGraderService;
  beforeEach(() => {
    grader = new QuizGraderService();
  });

  it('MULTIPLE_CHOICE: correct answer returns correct=true, score 100%', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Q?',
          options: [
            { id: 'a', text: '3' },
            { id: 'b', text: '4' },
          ],
          correctOptionIds: ['b'],
        },
      ],
      randomizeOrder: false,
      showExplanations: true,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: ['b'] });
    expect(result.itemResults[0]?.correct).toBe(true);
    expect(result.score).toBe(100);
  });

  it('MULTIPLE_CHOICE: wrong answer returns correct=false', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Q?',
          options: [
            { id: 'a', text: 'Berlin' },
            { id: 'b', text: 'Paris' },
          ],
          correctOptionIds: ['b'],
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: ['a'] });
    expect(result.itemResults[0]?.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('DRAG_ORDER: correct order returns correct=true', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'DRAG_ORDER',
          question: 'Order',
          items: [
            { id: '1', text: 'A' },
            { id: '2', text: 'B' },
          ],
          correctOrder: ['1', '2'],
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: ['1', '2'] });
    expect(result.itemResults[0]?.correct).toBe(true);
  });

  it('DRAG_ORDER: wrong order returns correct=false', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'DRAG_ORDER',
          question: 'Order',
          items: [
            { id: '1', text: 'A' },
            { id: '2', text: 'B' },
          ],
          correctOrder: ['1', '2'],
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: ['2', '1'] });
    expect(result.itemResults[0]?.correct).toBe(false);
  });

  it('MATCHING: all correct pairs gives 100% score', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'MATCHING',
          question: 'Match',
          leftItems: [
            { id: 'l1', text: 'Dog' },
            { id: 'l2', text: 'Cat' },
          ],
          rightItems: [
            { id: 'r1', text: 'Bark' },
            { id: 'r2', text: 'Meow' },
          ],
          correctPairs: [
            { leftId: 'l1', rightId: 'r1' },
            { leftId: 'l2', rightId: 'r2' },
          ],
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, {
      0: [
        { leftId: 'l1', rightId: 'r1' },
        { leftId: 'l2', rightId: 'r2' },
      ],
    });
    expect(result.itemResults[0]?.correct).toBe(true);
    expect(result.itemResults[0]?.partialScore).toBe(1);
  });

  it('MATCHING: partially correct pairs gives partial score', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'MATCHING',
          question: 'Match',
          leftItems: [
            { id: 'l1', text: 'Dog' },
            { id: 'l2', text: 'Cat' },
          ],
          rightItems: [
            { id: 'r1', text: 'Bark' },
            { id: 'r2', text: 'Meow' },
          ],
          correctPairs: [
            { leftId: 'l1', rightId: 'r1' },
            { leftId: 'l2', rightId: 'r2' },
          ],
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: [{ leftId: 'l1', rightId: 'r1' }] });
    expect(result.itemResults[0]?.correct).toBe(false);
    expect(result.itemResults[0]?.partialScore).toBe(0.5);
  });

  it('FILL_BLANK: exact match case insensitive returns correct=true', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'FILL_BLANK',
          question: 'Capital',
          correctAnswer: 'Paris',
          useSemanticMatching: false,
          similarityThreshold: 0.85,
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: 'paris' });
    expect(result.itemResults[0]?.correct).toBe(true);
  });

  it('FILL_BLANK: wrong answer returns correct=false', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'FILL_BLANK',
          question: 'Capital',
          correctAnswer: 'Paris',
          useSemanticMatching: false,
          similarityThreshold: 0.85,
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 70,
    };
    const result = grader.grade(quiz, { 0: 'Berlin' });
    expect(result.itemResults[0]?.correct).toBe(false);
  });

  it('LIKERT: always returns correct=true regardless of value', () => {
    const quiz: QuizContent = {
      items: [{ type: 'LIKERT', question: 'Satisfaction?', scale: 5 }],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 0,
    };
    for (const val of [1, 3, 5]) {
      const result = grader.grade(quiz, { 0: val });
      expect(result.itemResults[0]?.correct).toBe(true);
    }
  });

  it('passes when score meets passingScore threshold', () => {
    const quiz: QuizContent = {
      items: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Q1',
          options: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
          correctOptionIds: ['a'],
        },
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Q2',
          options: [
            { id: 'c', text: 'C' },
            { id: 'd', text: 'D' },
          ],
          correctOptionIds: ['c'],
        },
      ],
      randomizeOrder: false,
      showExplanations: false,
      passingScore: 50,
    };
    const result = grader.grade(quiz, { 0: ['a'], 1: ['d'] });
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });
});
