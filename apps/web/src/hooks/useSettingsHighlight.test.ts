// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSettingsHighlight } from './useSettingsHighlight';

const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

describe('useSettingsHighlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearchParams.delete('highlight');
    mockSetSearchParams.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null highlightId when no query param', () => {
    const { result } = renderHook(() => useSettingsHighlight());
    expect(result.current.highlightId).toBeNull();
    expect(result.current.isHighlighted).toBe(false);
    expect(result.current.highlightClass).toBe('');
  });

  it('returns highlightId from query param', () => {
    mockSearchParams.set('highlight', 'ai-consent');
    const { result } = renderHook(() => useSettingsHighlight());
    expect(result.current.highlightId).toBe('ai-consent');
  });

  it('scrolls into view and highlights when targetRef called', () => {
    mockSearchParams.set('highlight', 'ai-consent');
    const { result } = renderHook(() => useSettingsHighlight());

    const mockNode = {
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement;

    act(() => {
      result.current.targetRef(mockNode);
    });

    // After scroll delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockNode.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(result.current.isHighlighted).toBe(true);
    expect(result.current.highlightClass).toBe('animate-settings-highlight');
  });

  it('removes highlight after duration', () => {
    mockSearchParams.set('highlight', 'ai-consent');
    const { result } = renderHook(() => useSettingsHighlight());

    const mockNode = { scrollIntoView: vi.fn() } as unknown as HTMLElement;

    act(() => {
      result.current.targetRef(mockNode);
    });

    act(() => {
      vi.advanceTimersByTime(300); // scroll delay
    });

    act(() => {
      vi.advanceTimersByTime(4000); // highlight duration
    });

    expect(result.current.isHighlighted).toBe(false);
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  it('does nothing when targetRef called with null', () => {
    mockSearchParams.set('highlight', 'ai-consent');
    const { result } = renderHook(() => useSettingsHighlight());

    act(() => {
      result.current.targetRef(null);
    });

    expect(result.current.isHighlighted).toBe(false);
  });
});
