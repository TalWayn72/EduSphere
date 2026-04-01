import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

import React from 'react';
import { CourseLessonsSection } from './CourseLessonsSection';

const lessons = [
  { id: 'l-1', title: 'Lesson 1', type: 'VIDEO', status: 'PUBLISHED' },
  { id: 'l-2', title: 'Lesson 2', type: 'QUIZ', status: 'PROCESSING' },
];

describe('CourseLessonsSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders lesson titles', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection
          courseId="c-1"
          lessons={lessons}
          canEdit={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('Lesson 2')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection
          courseId="c-1"
          lessons={lessons}
          canEdit={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
  });

  it('shows add lesson button when canEdit is true', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection courseId="c-1" lessons={lessons} canEdit={true} />
      </MemoryRouter>
    );
    expect(screen.getByText(/addLesson/)).toBeInTheDocument();
  });

  it('hides add lesson button when canEdit is false', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection
          courseId="c-1"
          lessons={lessons}
          canEdit={false}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText(/addLesson/)).not.toBeInTheDocument();
  });

  it('shows empty state for student when no lessons', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection courseId="c-1" lessons={[]} canEdit={false} />
      </MemoryRouter>
    );
    expect(screen.getByText('noLessonsYetStudent')).toBeInTheDocument();
  });

  it('shows empty state for instructor when no lessons', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection courseId="c-1" lessons={[]} canEdit={true} />
      </MemoryRouter>
    );
    expect(screen.getByText('noLessonsYetInstructor')).toBeInTheDocument();
  });

  it('navigates to lesson on click', () => {
    render(
      <MemoryRouter>
        <CourseLessonsSection
          courseId="c-1"
          lessons={lessons}
          canEdit={false}
        />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Lesson 1'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/c-1/lessons/l-1');
  });
});
