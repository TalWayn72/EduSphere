import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    <div data-testid="card" onClick={props.onClick as () => void}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

import { CourseCard } from './CourseCard';

const course = {
  id: 'c-1',
  title: 'React Fundamentals',
  description: 'Learn React basics',
  thumbnailUrl: null,
  estimatedHours: 5,
  isPublished: true,
  instructorName: 'Instructor A',
  enrollmentCount: 42,
};

const baseProps = {
  course,
  published: true,
  isEnrolled: false,
  isInstructor: false,
  onEnroll: vi.fn(),
  onTogglePublish: vi.fn(),
};

describe('CourseCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders course title', () => {
    render(<MemoryRouter><CourseCard {...baseProps} /></MemoryRouter>);
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
  });

  it('navigates to course detail on card click', () => {
    render(<MemoryRouter><CourseCard {...baseProps} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('card'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/c-1');
  });

  it('renders without crash when isEnrolled', () => {
    const { container } = render(<MemoryRouter><CourseCard {...baseProps} isEnrolled={true} /></MemoryRouter>);
    expect(container).toBeTruthy();
  });

  it('shows draft badge for unpublished instructor course', () => {
    render(
      <MemoryRouter>
        <CourseCard {...baseProps} isInstructor={true} published={false} />
      </MemoryRouter>
    );
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><CourseCard {...baseProps} /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});
