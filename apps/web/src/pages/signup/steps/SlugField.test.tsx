import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
}));

import { SlugField } from './SlugField';

describe('SlugField', () => {
  it('renders without crash', () => {
    const { container } = render(
      <SlugField
        slug="test-slug"
        slugQuery="test"
        onChange={vi.fn()}
        onSuggestionPick={vi.fn()}
        t={(k: string) => k}
      />
    );
    expect(container).toBeTruthy();
  });
});
