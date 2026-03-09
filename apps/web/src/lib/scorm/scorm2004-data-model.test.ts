import { describe, it, expect } from 'vitest';
import {
  createDefaultCmiModel,
  parseDuration,
  formatDuration,
  addDurations,
  SCORM2004_ERROR_CODES,
} from './scorm2004-data-model';

describe('scorm2004-data-model', () => {
  describe('createDefaultCmiModel', () => {
    it('sets learner_id and learner_name', () => {
      const cmi = createDefaultCmiModel('user-123', 'Alice');
      expect(cmi['cmi.learner_id']).toBe('user-123');
      expect(cmi['cmi.learner_name']).toBe('Alice');
    });

    it('sets completion_status to not attempted', () => {
      const cmi = createDefaultCmiModel('u', 'n');
      expect(cmi['cmi.completion_status']).toBe('not attempted');
    });

    it('sets success_status to unknown', () => {
      const cmi = createDefaultCmiModel('u', 'n');
      expect(cmi['cmi.success_status']).toBe('unknown');
    });

    it('sets entry to ab-initio', () => {
      const cmi = createDefaultCmiModel('u', 'n');
      expect(cmi['cmi.entry']).toBe('ab-initio');
    });

    it('sets score defaults', () => {
      const cmi = createDefaultCmiModel('u', 'n');
      expect(cmi['cmi.score.scaled']).toBeNull();
      expect(cmi['cmi.score.min']).toBe(0);
      expect(cmi['cmi.score.max']).toBe(100);
    });

    it('sets session_time and total_time to PT0S', () => {
      const cmi = createDefaultCmiModel('u', 'n');
      expect(cmi['cmi.session_time']).toBe('PT0S');
      expect(cmi['cmi.total_time']).toBe('PT0S');
    });
  });

  describe('parseDuration', () => {
    it('parses PT1H30M correctly', () => {
      expect(parseDuration('PT1H30M')).toBe(5400);
    });

    it('handles PT0S', () => {
      expect(parseDuration('PT0S')).toBe(0);
    });

    it('parses PT90S', () => {
      expect(parseDuration('PT90S')).toBe(90);
    });

    it('parses P1DT2H', () => {
      expect(parseDuration('P1DT2H')).toBe(93600);
    });

    it('parses PT1H30M45S', () => {
      expect(parseDuration('PT1H30M45S')).toBe(5445);
    });

    it('returns 0 for invalid string', () => {
      expect(parseDuration('invalid')).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats 5400 seconds as PT1H30M', () => {
      expect(formatDuration(5400)).toBe('PT1H30M');
    });

    it('returns PT0S for 0', () => {
      expect(formatDuration(0)).toBe('PT0S');
    });

    it('formats 90 seconds as PT1M30S', () => {
      expect(formatDuration(90)).toBe('PT1M30S');
    });

    it('formats 3661 seconds as PT1H1M1S', () => {
      expect(formatDuration(3661)).toBe('PT1H1M1S');
    });
  });

  describe('addDurations', () => {
    it('adds two durations correctly', () => {
      expect(addDurations('PT30M', 'PT30M')).toBe('PT1H');
    });

    it('handles zero duration', () => {
      expect(addDurations('PT0S', 'PT1H')).toBe('PT1H');
    });
  });

  describe('SCORM2004_ERROR_CODES', () => {
    it('has NO_ERROR as "0"', () => {
      expect(SCORM2004_ERROR_CODES.NO_ERROR).toBe('0');
    });

    it('has GENERAL_EXCEPTION as "101"', () => {
      expect(SCORM2004_ERROR_CODES.GENERAL_EXCEPTION).toBe('101');
    });
  });
});
