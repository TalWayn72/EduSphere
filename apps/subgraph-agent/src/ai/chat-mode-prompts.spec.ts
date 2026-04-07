/**
 * chat-mode-prompts.spec.ts
 * Verifies that each chat mode has a distinct, non-empty system prompt.
 */
import { describe, it, expect } from 'vitest';
import {
  CHAVRUTA_SYSTEM_PROMPT,
  QUIZ_SYSTEM_PROMPT,
  EXPLAIN_SYSTEM_PROMPT,
} from './chat-mode-prompts.js';

describe('chat-mode-prompts', () => {
  it('CHAVRUTA_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof CHAVRUTA_SYSTEM_PROMPT).toBe('string');
    expect(CHAVRUTA_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it('QUIZ_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof QUIZ_SYSTEM_PROMPT).toBe('string');
    expect(QUIZ_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it('EXPLAIN_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof EXPLAIN_SYSTEM_PROMPT).toBe('string');
    expect(EXPLAIN_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it('all three prompts are distinct from each other', () => {
    expect(CHAVRUTA_SYSTEM_PROMPT).not.toBe(QUIZ_SYSTEM_PROMPT);
    expect(CHAVRUTA_SYSTEM_PROMPT).not.toBe(EXPLAIN_SYSTEM_PROMPT);
    expect(QUIZ_SYSTEM_PROMPT).not.toBe(EXPLAIN_SYSTEM_PROMPT);
  });

  it('CHAVRUTA prompt references Socratic or Chavruta behavior', () => {
    const text = CHAVRUTA_SYSTEM_PROMPT.toLowerCase();
    expect(
      text.includes('socratic') ||
        text.includes('chavruta') ||
        text.includes('חברותא')
    ).toBe(true);
  });

  it('QUIZ prompt references quiz or question behavior', () => {
    const text = QUIZ_SYSTEM_PROMPT.toLowerCase();
    expect(
      text.includes('quiz') ||
        text.includes('question') ||
        text.includes('בוחן')
    ).toBe(true);
  });

  it('EXPLAIN prompt references explaining or teaching behavior', () => {
    const text = EXPLAIN_SYSTEM_PROMPT.toLowerCase();
    expect(
      text.includes('explain') ||
        text.includes('teach') ||
        text.includes('להסביר')
    ).toBe(true);
  });
});
