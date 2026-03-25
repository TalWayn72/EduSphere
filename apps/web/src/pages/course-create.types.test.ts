import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_OPTIONS,
  THUMBNAIL_OPTIONS,
  DEFAULT_FORM,
  type Difficulty,
  type CourseFormData,
} from './course-create.types';

describe('course-create.types', () => {
  describe('DIFFICULTY_OPTIONS', () => {
    it('has exactly 3 difficulty levels', () => {
      expect(DIFFICULTY_OPTIONS).toHaveLength(3);
    });

    it('contains BEGINNER, INTERMEDIATE, ADVANCED', () => {
      const values = DIFFICULTY_OPTIONS.map((o) => o.value);
      expect(values).toEqual(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
    });

    it('has human-readable labels', () => {
      const labels = DIFFICULTY_OPTIONS.map((o) => o.label);
      expect(labels).toEqual(['Beginner', 'Intermediate', 'Advanced']);
    });
  });

  describe('THUMBNAIL_OPTIONS', () => {
    it('has 10 emoji thumbnails', () => {
      expect(THUMBNAIL_OPTIONS).toHaveLength(10);
    });

    it('contains only string entries', () => {
      THUMBNAIL_OPTIONS.forEach((t) => {
        expect(typeof t).toBe('string');
      });
    });
  });

  describe('DEFAULT_FORM', () => {
    it('has empty title', () => {
      expect(DEFAULT_FORM.title).toBe('');
    });

    it('has empty description', () => {
      expect(DEFAULT_FORM.description).toBe('');
    });

    it('defaults difficulty to BEGINNER', () => {
      expect(DEFAULT_FORM.difficulty).toBe('BEGINNER');
    });

    it('has empty duration', () => {
      expect(DEFAULT_FORM.duration).toBe('');
    });

    it('has empty modules array', () => {
      expect(DEFAULT_FORM.modules).toEqual([]);
    });

    it('has empty mediaList array', () => {
      expect(DEFAULT_FORM.mediaList).toEqual([]);
    });

    it('defaults published to false', () => {
      expect(DEFAULT_FORM.published).toBe(false);
    });

    it('satisfies CourseFormData interface shape', () => {
      const form: CourseFormData = DEFAULT_FORM;
      expect(form).toBeDefined();
    });
  });

  describe('Difficulty type', () => {
    it('accepts valid difficulty values', () => {
      const values: Difficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
      expect(values).toHaveLength(3);
    });
  });
});
