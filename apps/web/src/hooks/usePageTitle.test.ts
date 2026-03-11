import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePageTitle } from './usePageTitle';

describe('usePageTitle', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = originalTitle;
  });

  it('sets document.title with EduSphere suffix', () => {
    renderHook(() => usePageTitle('Pricing & Plans'));
    expect(document.title).toBe('Pricing & Plans — EduSphere');
  });

  it('uses default title when empty string is passed', () => {
    renderHook(() => usePageTitle(''));
    expect(document.title).toBe('EduSphere — AI-Native LMS');
  });

  it('restores previous title on unmount', () => {
    document.title = 'Previous Page Title';
    const { unmount } = renderHook(() => usePageTitle('Test Page'));
    expect(document.title).toBe('Test Page — EduSphere');
    unmount();
    expect(document.title).toBe('Previous Page Title');
  });

  it('updates title when hook argument changes', () => {
    const { rerender } = renderHook(({ title }: { title: string }) => usePageTitle(title), {
      initialProps: { title: 'Page One' },
    });
    expect(document.title).toBe('Page One — EduSphere');

    rerender({ title: 'Page Two' });
    expect(document.title).toBe('Page Two — EduSphere');
  });
});
