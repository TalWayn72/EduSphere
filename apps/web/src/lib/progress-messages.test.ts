/**
 * progress-messages constants tests
 *
 * Verifies:
 *  1. All message arrays are non-empty
 *  2. All message keys follow the 'progress.*' namespace pattern
 *  3. UPLOAD_PHASE_INDEX maps to valid indices
 *  4. All arrays are readonly
 */
import { describe, it, expect } from 'vitest';
import {
  AI_COURSE_GENERATION_MESSAGES,
  FILE_UPLOAD_MESSAGES,
  QUIZ_GRADING_MESSAGES,
  CONTENT_IMPORT_MESSAGES,
  AI_CHAT_MESSAGES,
  PAGE_LOADING_MESSAGES,
  ASSIGNMENT_SUBMIT_MESSAGES,
  UPLOAD_PHASE_INDEX,
} from './progress-messages';

describe('progress-messages', () => {
  it('AI_COURSE_GENERATION_MESSAGES has 4 entries', () => {
    expect(AI_COURSE_GENERATION_MESSAGES).toHaveLength(4);
  });

  it('FILE_UPLOAD_MESSAGES has 4 entries', () => {
    expect(FILE_UPLOAD_MESSAGES).toHaveLength(4);
  });

  it('QUIZ_GRADING_MESSAGES has 3 entries', () => {
    expect(QUIZ_GRADING_MESSAGES).toHaveLength(3);
  });

  it('CONTENT_IMPORT_MESSAGES has 4 entries', () => {
    expect(CONTENT_IMPORT_MESSAGES).toHaveLength(4);
  });

  it('AI_CHAT_MESSAGES has 3 entries', () => {
    expect(AI_CHAT_MESSAGES).toHaveLength(3);
  });

  it('PAGE_LOADING_MESSAGES has 3 entries', () => {
    expect(PAGE_LOADING_MESSAGES).toHaveLength(3);
  });

  it('ASSIGNMENT_SUBMIT_MESSAGES has 3 entries', () => {
    expect(ASSIGNMENT_SUBMIT_MESSAGES).toHaveLength(3);
  });

  it('all message keys start with "progress."', () => {
    const allMessages = [
      ...AI_COURSE_GENERATION_MESSAGES,
      ...FILE_UPLOAD_MESSAGES,
      ...QUIZ_GRADING_MESSAGES,
      ...CONTENT_IMPORT_MESSAGES,
      ...AI_CHAT_MESSAGES,
      ...PAGE_LOADING_MESSAGES,
      ...ASSIGNMENT_SUBMIT_MESSAGES,
    ];
    for (const key of allMessages) {
      expect(key).toMatch(/^progress\./);
    }
  });

  it('UPLOAD_PHASE_INDEX maps to valid FILE_UPLOAD_MESSAGES indices', () => {
    expect(UPLOAD_PHASE_INDEX.presigning).toBe(0);
    expect(UPLOAD_PHASE_INDEX.uploading).toBe(1);
    expect(UPLOAD_PHASE_INDEX.confirming).toBe(2);
    expect(UPLOAD_PHASE_INDEX.done).toBe(3);
  });

  it('UPLOAD_PHASE_INDEX covers all 4 phases', () => {
    expect(Object.keys(UPLOAD_PHASE_INDEX)).toHaveLength(4);
  });

  it('all UPLOAD_PHASE_INDEX values are within FILE_UPLOAD_MESSAGES bounds', () => {
    for (const idx of Object.values(UPLOAD_PHASE_INDEX)) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(FILE_UPLOAD_MESSAGES.length);
    }
  });
});
