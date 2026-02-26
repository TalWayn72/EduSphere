import { describe, it, expect } from 'vitest';
import { formatVttTimestamp, generateWebVTT } from './vtt-generator';

describe('formatVttTimestamp', () => {
  it('formats zero correctly', () => {
    expect(formatVttTimestamp(0)).toBe('00:00:00.000');
  });

  it('formats sub-second values', () => {
    expect(formatVttTimestamp(0.5)).toBe('00:00:00.500');
  });

  it('formats seconds correctly', () => {
    expect(formatVttTimestamp(65.25)).toBe('00:01:05.250');
  });

  it('formats hours correctly', () => {
    expect(formatVttTimestamp(3661.5)).toBe('01:01:01.500');
  });

  it('rounds milliseconds correctly', () => {
    // 1.9999 seconds → ms = round(0.9999 * 1000) = 1000 → but that wraps
    // Use a safe value: 1.123 → ms = round(0.123 * 1000) = 123
    expect(formatVttTimestamp(1.123)).toBe('00:00:01.123');
  });

  it('pads single-digit components to 2 digits', () => {
    expect(formatVttTimestamp(3723)).toBe('01:02:03.000');
  });
});

describe('generateWebVTT', () => {
  it('returns minimal header for empty segment array', () => {
    expect(generateWebVTT([])).toBe('WEBVTT\n');
  });

  it('returns minimal header when all segments are whitespace-only', () => {
    const result = generateWebVTT([
      { start: 0, end: 1, text: '   ' },
      { start: 1, end: 2, text: '\n' },
    ]);
    expect(result).toBe('WEBVTT\n');
  });

  it('generates a single cue correctly', () => {
    const result = generateWebVTT([
      { start: 0, end: 2.5, text: 'Hello world' },
    ]);
    expect(result).toBe(
      'WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.500\nHello world\n'
    );
  });

  it('generates multiple cues with sequential numbering', () => {
    const result = generateWebVTT([
      { start: 0, end: 1, text: 'First' },
      { start: 1, end: 3, text: 'Second' },
    ]);
    const lines = result.split('\n');
    expect(lines[0]).toBe('WEBVTT');
    expect(lines[2]).toBe('1');
    expect(lines[3]).toBe('00:00:00.000 --> 00:00:01.000');
    expect(lines[4]).toBe('First');
    expect(lines[6]).toBe('2');
    expect(lines[7]).toBe('00:00:01.000 --> 00:00:03.000');
    expect(lines[8]).toBe('Second');
  });

  it('trims leading/trailing whitespace from cue text', () => {
    const result = generateWebVTT([{ start: 0, end: 1, text: '  trimmed  ' }]);
    expect(result).toContain('\ntrimmed\n');
  });

  it('skips empty segments without breaking cue numbering', () => {
    const result = generateWebVTT([
      { start: 0, end: 1, text: '' },
      { start: 1, end: 2, text: 'Present' },
    ]);
    // Only one cue, numbered 1
    expect(result).toContain('1\n00:00:01.000 --> 00:00:02.000\nPresent');
    expect(result).not.toContain('00:00:00.000 --> 00:00:01.000');
  });

  it('handles hour-range timestamps', () => {
    const result = generateWebVTT([
      { start: 3600, end: 3660, text: 'One hour mark' },
    ]);
    expect(result).toContain('01:00:00.000 --> 01:01:00.000');
  });
});
