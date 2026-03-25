import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('./SearchResultCard', () => ({
  SearchResultCard: ({ result }: { result: { title: string } }) =>
    <div data-testid="result-card">{result.title}</div>,
}));

import { SearchResultsGroup } from './SearchResultsGroup';

describe('SearchResultsGroup', () => {
  it('renders without crash with empty results', () => {
    const { container } = render(
      <MemoryRouter>
        <SearchResultsGroup
          results={[]}
          query="test"
          typeConfig={{ icon: () => <span />, label: 'Course', color: 'text-blue-700', bg: 'bg-blue-50' }}
          label="Courses"
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders result cards', () => {
    render(
      <MemoryRouter>
        <SearchResultsGroup
          results={[
            { id: 'r-1', type: 'course', title: 'Course A', snippet: '', href: '/c' },
            { id: 'r-2', type: 'course', title: 'Course B', snippet: '', href: '/c' },
          ]}
          query="course"
          typeConfig={{ icon: () => <span />, label: 'Course', color: 'text-blue-700', bg: 'bg-blue-50' }}
          label="Courses"
        />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId('result-card')).toHaveLength(2);
  });
});
