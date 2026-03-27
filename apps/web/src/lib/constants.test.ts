import { describe, it, expect } from 'vitest';
import {
  TOAST_AUTO_DISMISS_MS,
  SAVED_CONFIRMATION_MS,
  SEARCH_DEBOUNCE_MS,
  SIMULATED_SAVE_MS,
  REFETCH_DELAY_MS,
  GRAPHQL_URL,
} from './constants';

describe('Timing constants', () => {
  it('TOAST_AUTO_DISMISS_MS is a positive number', () => {
    expect(typeof TOAST_AUTO_DISMISS_MS).toBe('number');
    expect(TOAST_AUTO_DISMISS_MS).toBeGreaterThan(0);
  });

  it('SAVED_CONFIRMATION_MS is a positive number', () => {
    expect(typeof SAVED_CONFIRMATION_MS).toBe('number');
    expect(SAVED_CONFIRMATION_MS).toBeGreaterThan(0);
  });

  it('SEARCH_DEBOUNCE_MS is a positive number', () => {
    expect(typeof SEARCH_DEBOUNCE_MS).toBe('number');
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThan(0);
  });

  it('SIMULATED_SAVE_MS is a positive number', () => {
    expect(typeof SIMULATED_SAVE_MS).toBe('number');
    expect(SIMULATED_SAVE_MS).toBeGreaterThan(0);
  });

  it('REFETCH_DELAY_MS is a positive number', () => {
    expect(typeof REFETCH_DELAY_MS).toBe('number');
    expect(REFETCH_DELAY_MS).toBeGreaterThan(0);
  });

  it('SEARCH_DEBOUNCE_MS is shorter than TOAST_AUTO_DISMISS_MS', () => {
    expect(SEARCH_DEBOUNCE_MS).toBeLessThan(TOAST_AUTO_DISMISS_MS);
  });

  it('all timing constants are reasonable (between 100ms and 30s)', () => {
    const timings = [
      TOAST_AUTO_DISMISS_MS,
      SAVED_CONFIRMATION_MS,
      SEARCH_DEBOUNCE_MS,
      SIMULATED_SAVE_MS,
      REFETCH_DELAY_MS,
    ];
    timings.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(100);
      expect(t).toBeLessThanOrEqual(30_000);
    });
  });
});

describe('GRAPHQL_URL', () => {
  it('is a non-empty string', () => {
    expect(typeof GRAPHQL_URL).toBe('string');
    expect(GRAPHQL_URL.length).toBeGreaterThan(0);
  });

  it('ends with /graphql or is a relative path', () => {
    expect(GRAPHQL_URL).toMatch(/\/graphql$/);
  });
});
