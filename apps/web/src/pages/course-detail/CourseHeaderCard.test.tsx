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
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/course/CoursePublishSheet', () => ({
  CoursePublishSheet: () => null,
}));

vi.mock('@/components/course/DeleteCourseButton', () => ({
  DeleteCourseButton: () => null,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => ({ role: 'INSTRUCTOR' }),
}));

import { CourseHeaderCard } from './CourseHeaderCard';

const baseProps = {
  course: {
    id: 'c-1',
    title: 'Test Course',
    description: 'A test course description',
    thumbnailUrl: null,
    estimatedHours: 3,
    isPublished: true,
    instructorId: 'u-1',
    modules: [{ id: 'm-1', title: 'Module 1', orderIndex: 0, contentItems: [] }],
  },
  courseId: 'c-1',
  canEdit: true,
  isEnrolled: false,
  optimisticEnrolled: false,
  progress: undefined,
  isEnrolling: false,
  isForkingCourse: false,
  isSavingTitle: false,
  forkError: null,
  editMode: false,
  editTitle: '',
  onEditModeChange: vi.fn(),
  onEditTitleChange: vi.fn(),
  onSaveTitle: vi.fn(),
  onForkCourse: vi.fn(),
  onEnroll: vi.fn(),
  onDismissForkError: vi.fn(),
};

describe('CourseHeaderCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders course title', () => {
    render(<MemoryRouter><CourseHeaderCard {...baseProps} /></MemoryRouter>);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('renders course description', () => {
    render(<MemoryRouter><CourseHeaderCard {...baseProps} /></MemoryRouter>);
    expect(screen.getByText('A test course description')).toBeInTheDocument();
  });

  it('renders without crash when canEdit is false', () => {
    render(<MemoryRouter><CourseHeaderCard {...baseProps} canEdit={false} /></MemoryRouter>);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('renders without crash when optimisticEnrolled', () => {
    const { container } = render(<MemoryRouter><CourseHeaderCard {...baseProps} optimisticEnrolled={true} /></MemoryRouter>);
    expect(container).toBeTruthy();
  });

  it('renders without crash when progress provided', () => {
    const { container } = render(
      <MemoryRouter>
        <CourseHeaderCard {...baseProps} progress={{ totalItems: 10, completedItems: 5, percentComplete: 50 }} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
