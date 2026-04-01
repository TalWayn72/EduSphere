import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('./CourseCard', () => ({
  CourseCard: ({ course }: { course: { title: string } }) => (
    <div data-testid="course-card">{course.title}</div>
  ),
}));

import { CourseGrid } from './CourseGrid';

const courses = [
  {
    id: 'c-1',
    title: 'Course A',
    description: '',
    thumbnailUrl: null,
    estimatedHours: 2,
    isPublished: true,
    instructorName: 'A',
    enrollmentCount: 0,
  },
  {
    id: 'c-2',
    title: 'Course B',
    description: '',
    thumbnailUrl: null,
    estimatedHours: 3,
    isPublished: false,
    instructorName: 'B',
    enrollmentCount: 5,
  },
];

const baseProps = {
  courses,
  fetching: false,
  isInstructor: false,
  enrolledCourseIds: new Set<string>(),
  isPublished: (c: { isPublished: boolean }) => c.isPublished,
  onEnroll: vi.fn(),
  onTogglePublish: vi.fn(),
};

describe('CourseGrid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders course cards', () => {
    render(
      <MemoryRouter>
        <CourseGrid {...baseProps} />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId('course-card')).toHaveLength(2);
  });

  it('shows loading state when fetching', () => {
    render(
      <MemoryRouter>
        <CourseGrid {...baseProps} fetching={true} />
      </MemoryRouter>
    );
    expect(screen.getByText('loadingCourses')).toBeInTheDocument();
  });

  it('shows empty state when no courses', () => {
    render(
      <MemoryRouter>
        <CourseGrid {...baseProps} courses={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText('noCoursesYet')).toBeInTheDocument();
  });

  it('renders course titles', () => {
    render(
      <MemoryRouter>
        <CourseGrid {...baseProps} />
      </MemoryRouter>
    );
    expect(screen.getByText('Course A')).toBeInTheDocument();
    expect(screen.getByText('Course B')).toBeInTheDocument();
  });
});
