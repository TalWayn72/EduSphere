import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as urql from 'urql';
import { ReviewAssignmentPage } from './ReviewAssignmentPage';

vi.mock('urql', async () => ({
  ...(await vi.importActual('urql')),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}));

const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined }),
] as never;

describe('ReviewAssignmentPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders rubric scorer', () => {
    render(
      <MemoryRouter initialEntries={['/peer-review/a1']}>
        <Routes>
          <Route path="/peer-review/:id" element={<ReviewAssignmentPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Content Quality/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(
      <MemoryRouter initialEntries={['/peer-review/a1']}>
        <Routes>
          <Route path="/peer-review/:id" element={<ReviewAssignmentPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
  });

  it('renders feedback textarea', () => {
    render(
      <MemoryRouter initialEntries={['/peer-review/a1']}>
        <Routes>
          <Route path="/peer-review/:id" element={<ReviewAssignmentPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
