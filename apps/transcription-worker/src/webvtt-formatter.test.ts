/**
 * Tests for webvtt-formatter.ts
 * WCAG 1.2.2 — Captions (Prerecorded)
 */
import { describe, it, expect } from 'vitest';
import { formatTimestamp, formatToWebVTT } from './webvtt-formatter';
import type { WhisperSegment } from './webvtt-formatter';

// ── formatTimestamp ────────────────────────────────────────────────────────────

describe('formatTimestamp', () => {
  it('formats zero as 00:00:00.000', () => {
    expect(formatTimestamp(0)).toBe('00:00:00.000');
  });

  it('formats sub-second fractional values', () => {
    expect(formatTimestamp(0.5)).toBe('00:00:00.500');
  });

  it('formats seconds and minutes correctly', () => {
    expect(formatTimestamp(65.25)).toBe('00:01:05.250');
  });

  it('formats hours correctly', () => {
    expect(formatTimestamp(3661.5)).toBe('01:01:01.500');
  });

  it('pads single-digit components to two digits', () => {
    expect(formatTimestamp(3723)).toBe('01:02:03.000');
  });

  it('rounds milliseconds to nearest integer', () => {
    expect(formatTimestamp(1.123)).toBe('00:00:01.123');
  });

  it('pads milliseconds to three digits', () => {
    expect(formatTimestamp(1.007)).toBe('00:00:01.007');
  });
});

// ── formatToWebVTT ─────────────────────────────────────────────────────────────

describe('formatToWebVTT', () => {
  it('returns minimal valid WebVTT header for empty segments', () => {
    expect(formatToWebVTT([])).toBe('WEBVTT\n');
  });

  it('returns minimal header when all segments are whitespace-only', () => {
    const segments: WhisperSegment[] = [
      { start: 0, end: 1, text: '   ' },
      { start: 1, end: 2, text: '\n' },
      { start: 2, end: 3, text: '' },
    ];
    expect(formatToWebVTT(segments)).toBe('WEBVTT\n');
  });

  it('produces valid WEBVTT header as first line', () => {
    const result = formatToWebVTT([{ start: 0, end: 1, text: 'Hello' }]);
    expect(result.startsWith('WEBVTT')).toBe(true);
  });

  it('formats timestamps in HH:MM:SS.mmm format', () => {
    const result = formatToWebVTT([{ start: 0, end: 3.5, text: 'First caption.' }]);
    expect(result).toContain('00:00:00.000 --> 00:00:03.500');
  });

  it('generates correct single-cue output', () => {
    const result = formatToWebVTT([{ start: 0, end: 2.5, text: 'Hello world' }]);
    expect(result).toBe('WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.500\nHello world\n');
  });

  it('generates multiple cues with sequential 1-based numbering', () => {
    const segments: WhisperSegment[] = [
      { start: 0, end: 1, text: 'First' },
      { start: 1, end: 3, text: 'Second' },
    ];
    const result = formatToWebVTT(segments);
    const lines = result.split('\n');
    expect(lines[0]).toBe('WEBVTT');
    expect(lines[2]).toBe('1');
    expect(lines[3]).toBe('00:00:00.000 --> 00:00:01.000');
    expect(lines[4]).toBe('First');
    expect(lines[6]).toBe('2');
    expect(lines[7]).toBe('00:00:01.000 --> 00:00:03.000');
    expect(lines[8]).toBe('Second');
  });

  it('trims leading and trailing whitespace from cue text', () => {
    const result = formatToWebVTT([{ start: 0, end: 1, text: '  trimmed  ' }]);
    expect(result).toContain('\ntrimmed\n');
    expect(result).not.toContain('  trimmed  ');
  });

  it('skips empty segments without breaking cue numbering', () => {
    const segments: WhisperSegment[] = [
      { start: 0, end: 1, text: '' },
      { start: 1, end: 2, text: 'Present' },
    ];
    const result = formatToWebVTT(segments);
    // Only one cue should be emitted, numbered 1
    expect(result).toContain('1\n00:00:01.000 --> 00:00:02.000\nPresent');
    expect(result).not.toContain('00:00:00.000 --> 00:00:01.000');
  });

  it('handles hour-range timestamps correctly', () => {
    const result = formatToWebVTT([{ start: 3600, end: 3660, text: 'One hour mark' }]);
    expect(result).toContain('01:00:00.000 --> 01:01:00.000');
  });

  it('handles special HTML characters without escaping (VTT handles display)', () => {
    const result = formatToWebVTT([{ start: 0, end: 1, text: 'Hello & <world>' }]);
    expect(result).toContain('Hello & <world>');
  });

  it('separates cues with blank lines per WebVTT spec', () => {
    const result = formatToWebVTT([
      { start: 0, end: 1, text: 'A' },
      { start: 1, end: 2, text: 'B' },
    ]);
    // Blank line between cues (double newline between cue blocks)
    expect(result).toMatch(/A\n\n2\n/);
  });
});
