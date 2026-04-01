import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  ADD_LESSON_ASSET_MUTATION: 'ADD_LESSON_ASSET_MUTATION',
}));

import { AddVideoPanel } from './AddVideoPanel';

describe('AddVideoPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crash', () => {
    const { container } = render(
      <MemoryRouter>
        <AddVideoPanel
          lessonId="l-1"
          courseId="c-1"
          lessonTitle="Test Lesson"
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
