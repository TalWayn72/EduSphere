import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('./Highlight', () => ({
  Highlight: ({ text }: { text: string }) => <span>{text}</span>,
}));

import { SearchResultCard } from './SearchResultCard';

describe('SearchResultCard', () => {
  it('renders result title', () => {
    render(
      <MemoryRouter>
        <SearchResultCard
          result={{
            id: 'r-1',
            type: 'course',
            title: 'Test Course',
            snippet: 'A course',
            href: '/courses',
          }}
          query="test"
          typeConfig={{
            icon: () => <span />,
            label: 'Course',
            color: 'text-blue-700',
            bg: 'bg-blue-50',
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('renders snippet', () => {
    render(
      <MemoryRouter>
        <SearchResultCard
          result={{
            id: 'r-1',
            type: 'course',
            title: 'TC',
            snippet: 'A snippet here',
            href: '/courses',
          }}
          query="test"
          typeConfig={{
            icon: () => <span />,
            label: 'Course',
            color: 'text-blue-700',
            bg: 'bg-blue-50',
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('A snippet here')).toBeInTheDocument();
  });
});
