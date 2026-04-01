/**
 * DirectionContext tests
 *
 * Verifies:
 *  1. Default direction is 'ltr'
 *  2. isRtl is false for LTR languages
 *  3. Direction updates when i18n language changes to RTL
 *  4. Direction updates back to LTR
 *  5. useDirection hook returns context values
 *  6. Cleanup removes i18n listener on unmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Track registered listeners
const listeners: Record<string, Array<(lng: string) => void>> = {};

vi.mock('i18next', () => ({
  default: {
    language: 'en',
    on: vi.fn((event: string, cb: (lng: string) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: (lng: string) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((fn) => fn !== cb);
      }
    }),
  },
}));

vi.mock('@edusphere/i18n', () => ({
  RTL_LOCALES: new Set(['he', 'ar']),
}));

vi.mock('@/lib/i18n', () => ({
  applyDocumentDirection: vi.fn(),
}));

import { DirectionProvider, useDirection } from './DirectionContext';
import { applyDocumentDirection } from '@/lib/i18n';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(DirectionProvider, null, children);
}

describe('DirectionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners['languageChanged'] = [];
  });

  afterEach(() => {
    listeners['languageChanged'] = [];
  });

  it('provides LTR direction by default (English)', () => {
    const { result } = renderHook(() => useDirection(), { wrapper });
    expect(result.current.direction).toBe('ltr');
    expect(result.current.isRtl).toBe(false);
  });

  it('switches to RTL when language changes to Hebrew', () => {
    const { result } = renderHook(() => useDirection(), { wrapper });

    act(() => {
      for (const cb of listeners['languageChanged'] ?? []) {
        cb('he');
      }
    });

    expect(result.current.direction).toBe('rtl');
    expect(result.current.isRtl).toBe(true);
  });

  it('switches back to LTR when language changes to English', () => {
    const { result } = renderHook(() => useDirection(), { wrapper });

    act(() => {
      for (const cb of listeners['languageChanged'] ?? []) {
        cb('he');
      }
    });

    expect(result.current.isRtl).toBe(true);

    act(() => {
      for (const cb of listeners['languageChanged'] ?? []) {
        cb('en');
      }
    });

    expect(result.current.direction).toBe('ltr');
    expect(result.current.isRtl).toBe(false);
  });

  it('returns default context values when used outside provider', () => {
    const { result } = renderHook(() => useDirection());
    expect(result.current.direction).toBe('ltr');
    expect(result.current.isRtl).toBe(false);
  });

  it('IS-5568: calls applyDocumentDirection on language change', () => {
    renderHook(() => useDirection(), { wrapper });

    act(() => {
      for (const cb of listeners['languageChanged'] ?? []) {
        cb('he');
      }
    });

    expect(applyDocumentDirection).toHaveBeenCalledWith('he');
  });

  it('cleans up i18n listener on unmount', async () => {
    const i18n = await import('i18next');
    const { unmount } = renderHook(() => useDirection(), { wrapper });
    unmount();
    expect(i18n.default.off).toHaveBeenCalledWith(
      'languageChanged',
      expect.any(Function)
    );
  });
});
