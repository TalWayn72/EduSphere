/**
 * CourseCreatePage — Zod schema validation tests.
 *
 * These tests validate the courseSchema directly (no DOM required) and
 * confirm that the correct error messages are produced for each field.
 */
import { describe, it, expect } from 'vitest';
import { courseSchema } from './CourseCreatePage';

describe('courseSchema', () => {
  const validInput = {
    title: 'Introduction to Talmud',
    description:
      'A comprehensive introduction to Talmudic study and methodology.',
    difficulty: 'BEGINNER' as const,
    duration: '6 weeks',
    thumbnail: '📚',
  };

  it('accepts a fully valid course form', () => {
    const result = courseSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts an empty description (optional field)', () => {
    const result = courseSchema.safeParse({ ...validInput, description: '' });
    expect(result.success).toBe(true);
  });

  it('accepts a missing duration (optional field)', () => {
    const result = courseSchema.safeParse({
      ...validInput,
      duration: undefined,
    });
    expect(result.success).toBe(true);
  });

  describe('title validation', () => {
    it('rejects an empty title', () => {
      const result = courseSchema.safeParse({ ...validInput, title: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const titleErrors = result.error.issues.filter(
          (i) => i.path[0] === 'title'
        );
        expect(titleErrors.length).toBeGreaterThan(0);
      }
    });

    it('rejects a title that is too short (< 3 chars)', () => {
      const result = courseSchema.safeParse({ ...validInput, title: 'AB' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(
          (i) => i.path[0] === 'title'
        );
        expect(titleError?.message).toBe('Title must be at least 3 characters');
      }
    });

    it('accepts a title exactly 3 characters long', () => {
      const result = courseSchema.safeParse({ ...validInput, title: 'ABC' });
      expect(result.success).toBe(true);
    });
  });

  describe('description validation', () => {
    it('rejects a non-empty description shorter than 10 characters', () => {
      const result = courseSchema.safeParse({
        ...validInput,
        description: 'Too short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const descError = result.error.issues.find(
          (i) => i.path[0] === 'description'
        );
        expect(descError?.message).toBe(
          'Description must be at least 10 characters'
        );
      }
    });
  });

  describe('difficulty validation', () => {
    it('rejects an unknown difficulty level', () => {
      const result = courseSchema.safeParse({
        ...validInput,
        difficulty: 'EXPERT',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid difficulty enum values', () => {
      for (const level of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const) {
        const result = courseSchema.safeParse({
          ...validInput,
          difficulty: level,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('thumbnail validation', () => {
    it('rejects an empty thumbnail', () => {
      const result = courseSchema.safeParse({ ...validInput, thumbnail: '' });
      expect(result.success).toBe(false);
    });
  });

  it('collects all errors when multiple fields are invalid', () => {
    const result = courseSchema.safeParse({
      title: '',
      description: 'short',
      difficulty: 'WRONG',
      thumbnail: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('title');
      expect(paths).toContain('difficulty');
      expect(paths).toContain('thumbnail');
    }
  });
});
