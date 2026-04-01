import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import {
  LAYER_META,
  SPEED_OPTIONS,
  formatTime,
  highlightText,
} from './content-viewer.utils';

describe('content-viewer.utils', () => {
  describe('LAYER_META', () => {
    it('contains all four layers', () => {
      expect(Object.keys(LAYER_META)).toEqual([
        'PERSONAL',
        'SHARED',
        'INSTRUCTOR',
        'AI_GENERATED',
      ]);
    });

    it('each layer has label, color, and bg', () => {
      for (const key of Object.keys(LAYER_META)) {
        const meta = LAYER_META[key];
        expect(meta).toHaveProperty('label');
        expect(meta).toHaveProperty('color');
        expect(meta).toHaveProperty('bg');
        expect(typeof meta.label).toBe('string');
        expect(typeof meta.color).toBe('string');
        expect(typeof meta.bg).toBe('string');
      }
    });
  });

  describe('SPEED_OPTIONS', () => {
    it('contains expected playback speeds', () => {
      expect([...SPEED_OPTIONS]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
    });
  });

  describe('formatTime', () => {
    it('formats 0 seconds as 0:00', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('formats seconds less than a minute', () => {
      expect(formatTime(45)).toBe('0:45');
    });

    it('formats full minutes', () => {
      expect(formatTime(120)).toBe('2:00');
    });

    it('formats minutes and seconds with padding', () => {
      expect(formatTime(65)).toBe('1:05');
    });

    it('floors fractional seconds', () => {
      expect(formatTime(90.7)).toBe('1:30');
    });
  });

  describe('highlightText', () => {
    it('returns plain text when query is empty', () => {
      const result = highlightText('Hello world', '');
      expect(result).toBe('Hello world');
    });

    it('returns plain text when query is shorter than 2 chars', () => {
      const result = highlightText('Hello world', 'H');
      expect(result).toBe('Hello world');
    });

    it('wraps matching text in <mark> tags', () => {
      const { container } = render(
        <>{highlightText('Hello world', 'world')}</>
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeTruthy();
      expect(mark!.textContent).toBe('world');
    });

    it('highlights case-insensitively', () => {
      const { container } = render(
        <>{highlightText('Hello World', 'hello')}</>
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeTruthy();
      expect(mark!.textContent).toBe('Hello');
    });

    it('renders non-matching parts in <span> elements', () => {
      const { container } = render(<>{highlightText('abc def ghi', 'def')}</>);
      const spans = container.querySelectorAll('span');
      expect(spans.length).toBeGreaterThanOrEqual(2);
      expect(container.textContent).toBe('abc def ghi');
    });

    it('escapes regex special characters in query', () => {
      const { container } = render(
        <>{highlightText('price is $10.00 today', '$10')}</>
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeTruthy();
      expect(mark!.textContent).toBe('$10');
    });
  });
});
